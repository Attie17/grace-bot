/**
 * Grace Conversation Engine - CORRECTED
 * 
 * Orchestrates the full intake conversation flow.
 * Handles:
 * - Message history
 * - Claude Haiku API calls (claude-haiku-4-5-20251001)
 * - Field extraction
 * - Escalation detection
 * - Database persistence
 */

import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import GRACE_SYSTEM_PROMPT from "../prompts/grace.system.js";
import { extractFieldsFromConversation } from "./fieldExtractor.js";
import { detectEscalation } from "./escalationDetector.js";
import { analyzeSentimentTrajectory } from "./sentimentAnalyzer.js";
import { buildGraceLeadPayload } from "./clinicalScoring.js";
import { notifyTherapist } from "./handoff.js";

class GraceConversationEngine {
  constructor(supabaseClient, logger) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = "claude-haiku-4-5-20251001";
    this.systemPrompt = GRACE_SYSTEM_PROMPT;
    this.supabase = supabaseClient;
    this.logger = logger;
    this.maxExchanges = 30; // ~15-20 min conversation
    this.responseTimeoutMs = 30000; // 30s timeout for Claude
  }

  /**
   * Main intake orchestration
   * Takes a phone number (caller ID) and message history
   * Returns conversationId, extracted fields, next action
   */
  async conductIntake(callerId, messages, conversationId = null) {
    if (!conversationId) {
      conversationId = uuidv4();
    }

    this.logger.info(
      { conversationId, callerId, messageCount: messages.length },
      "Starting intake conversation"
    );

    try {
      // Check for escalation FIRST (safety first)
      // FIX #1: Don't mutate the original array - create a copy first
      const lastCallerMessage = [...messages]
        .reverse()
        .find((m) => m.role === "user");
      
      if (lastCallerMessage) {
        const { escalated, reason } = detectEscalation(lastCallerMessage.content);
        if (escalated) {
          this.logger.warn(
            { conversationId, reason },
            "Escalation detected"
          );
          return {
            conversationId,
            escalationFlag: true,
            escalationReason: reason,
            nextAction: "ESCALATE_TO_HUMAN",
            graceResponse: this.getEscalationResponse(reason),
          };
        }
      }

      // Check if conversation is complete
      // Primary trigger: we have name + phone + at least 10 messages
      // Safety net: max exchanges reached regardless of data
      if (messages.length >= this.maxExchanges) {
        this.logger.info(
          { conversationId, exchanges: messages.length },
          "Max exchanges reached, wrapping up"
        );

        const wrappedUp = await this.wrapUpConversation(
          messages,
          conversationId,
          callerId
        );
        return wrappedUp;
      }

      // Early wrap-up: if we have minimum required data, wrap up naturally
      // This fires as soon as Grace has name + phone + basic conversation
      // rather than waiting for maxExchanges
      if (messages.length >= 10) {
        const earlyCheck = await extractFieldsFromConversation(messages, this.client);
        const hasMinimumData = earlyCheck.name?.value && earlyCheck.phone?.value;
        if (hasMinimumData) {
          this.logger.info(
            { conversationId, exchanges: messages.length, name: earlyCheck.name.value },
            "Minimum data captured, wrapping up early"
          );
          const wrappedUp = await this.wrapUpConversation(
            messages,
            conversationId,
            callerId
          );
          return wrappedUp;
        }
      }

      // Generate Grace response
      const graceResponse = await this.generateResponse(messages);

      // Extract fields from full conversation so far
      const extracted = await extractFieldsFromConversation(messages, this.client);
      const sentiment = await analyzeSentimentTrajectory(messages);

      // Append Grace's response to the message history and persist
      // This ensures subsequent turns can load the full conversation context
      const updatedMessages = [
        ...messages,
        { role: 'assistant', content: graceResponse },
      ];

      await this.saveConversation({
        id: conversationId,
        messages: updatedMessages,
        extractedFields: extracted,
        sentimentTrajectory: sentiment,
        status: 'in_progress',
      }, callerId);

      // Prepare return
      const result = {
        conversationId,
        graceResponse,
        extractedFields: extracted,
        sentimentTrajectory: sentiment,
        escalationFlag: false,
        nextAction: "CONTINUE_CONVERSATION",
      };

      // Log for monitoring
      this.logger.info(
        { conversationId, extracted: Object.keys(extracted) },
        "Conversation progress"
      );

      return result;
    } catch (error) {
      this.logger.error(
        { conversationId, error: error.message, stack: error.stack },
        "Error in intake conversation"
      );
      
      // FIX #2: Improved error handling with retry logic
      // Retry on transient failures (API overload, rate limiting)
      if ((error.message && error.message.includes("overloaded")) || 
          (error.status >= 500) || 
          (error.status === 429)) {
        this.logger.warn(
          { conversationId, retrying: true },
          "Transient error, retrying after 2s..."
        );
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.conductIntake(callerId, messages, conversationId); // Retry once
      }
      
      // Return graceful error to caller instead of crashing
      return {
        conversationId,
        graceResponse: "I'm having trouble connecting right now. Please try again in a moment.",
        escalationFlag: false,
        nextAction: "RETRY_LATER",
        error: error.message,
      };
    }
  }

  /**
   * Generate next response using Claude Sonnet
   */
  async generateResponse(messages) {
    // Build the message array for Claude
    const claudeMessages = messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 300, // Reasonable for WhatsApp response
        system: this.systemPrompt,
        messages: claudeMessages,
      });

      if (!response.content || response.content.length === 0) {
        throw new Error("Empty response from Claude");
      }

      const graceResponse = response.content[0].text;

      // Log token usage for cost tracking
      this.logger.debug(
        { usage: response.usage },
        "Claude API usage"
      );

      return graceResponse;
    } catch (error) {
      if (error.message.includes("overloaded")) {
        this.logger.warn("Claude API overloaded, retrying...");
        // Retry once after 1 second
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.generateResponse(messages);
      }
      throw error;
    }
  }

  /**
   * Wrap up conversation after max exchanges
   */
  async wrapUpConversation(messages, conversationId, callerId) {
    const extracted = await extractFieldsFromConversation(messages, this.client);
    const sentiment = await analyzeSentimentTrajectory(messages);

    const name = extracted.name?.value || null;
    const phone = extracted.phone?.value || null;
    const callerType = extracted.caller_type?.value || null;

    let inviteUrl = null;

    // Only attempt invite/lead creation if we have the minimum required data
    if (name && phone) {
      try {
        const invite = await this.generateInviteLink(name, phone, callerType);
        if (invite?.inviteUrl) {
          inviteUrl = invite.inviteUrl;
        }

        // Fire the full lead payload to SJ — non-blocking, don't let a
        // failure here stop the conversation from closing normally
        const leadPayload = buildGraceLeadPayload(extracted, conversationId);
        fetch(`${process.env.SJ_APP_URL}/api/webhooks/grace/lead`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": process.env.GRACE_WEBHOOK_SECRET,
          },
          body: JSON.stringify(leadPayload),
        }).then(async (res) => {
          if (!res.ok) {
            this.logger.error({ status: res.status, conversationId }, "SJ lead webhook returned error");
          } else {
            this.logger.info({ conversationId }, "SJ lead created successfully");
          }
        }).catch((err) => {
          this.logger.error({ error: err.message, conversationId }, "SJ lead webhook call failed");
        });
      } catch (error) {
        this.logger.error({ error: error.message, conversationId }, "Invite/lead creation failed, continuing without it");
      }
    } else {
      // Extraction failed even after a full conversation — caller is real and got this far.
      // Fire a manual-review alert so the counsellor can act on whatever partial info we have.
      this.logger.warn(
        { conversationId, callerId, name: name || '(unknown)', phone: phone || '(unknown)', messageCount: messages.length },
        "Incomplete extraction at wrap-up — flagging for manual counsellor follow-up"
      );
      const partialSubstance = extracted.primary_substance?.value || null;
      const partialCity = extracted.city_town?.value || null;
      const partialUrgency = extracted.urgency_level?.value || null;
      const manualBrief = {
        contact_name: name || '(name not captured)',
        contact_phone: phone || callerId,  // callerId is the WhatsApp number for WhatsApp callers
        city: partialCity,
        track: partialSubstance ? 'substance' : null,
        substance_primary: partialSubstance,
        urgency: partialUrgency || 'unknown',
        urgency_level: partialUrgency || 'normal',
        notes_for_therapist: `MANUAL REVIEW REQUIRED: Grace completed ${messages.length} messages but could not extract name or phone number from the conversation. Caller ID: ${callerId}. Partial data captured — substance: ${partialSubstance || 'unknown'}, city: ${partialCity || 'unknown'}. Review conversation ${conversationId} in the database.`,
        caller_type: callerType || 'self',
        language_preference: 'en',
      };
      // Non-blocking — don't let notification failure prevent conversation from closing
      notifyTherapist({
        sessionId: callerId,
        leadId: null,
        priority: partialUrgency === 'crisis' || partialUrgency === 'immediate' ? 'HIGH' : 'NORMAL',
        brief: manualBrief,
      }).catch(err => {
        this.logger.error({ error: err.message, conversationId }, "Manual-review notification failed");
      });
    }

    // Generate final summary response — deliberately does NOT mention any
    // URL, so Claude never has to generate or guess at one
    const summaryPrompt = `Based on this conversation, write exactly ONE sentence — warm, personal, using the caller's name if you have it. Confirm that someone from Stabilis will be in touch soon. Do NOT mention a specific time. Do NOT include emergency numbers. Do NOT include any links or URLs. One sentence only.`;

    const finalMessages = [
      ...messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      {
        role: "user",
        content: summaryPrompt,
      },
    ];

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 200,
      system: this.systemPrompt,
      messages: finalMessages,
    });

    let closingMessage = response.content[0].text;

    // Append the real invite URL programmatically — never let the model
    // generate or touch it, same safety principle used in ai-grace.js
    if (inviteUrl) {
      closingMessage += `\n\nThis is the end of our discussion. Thank you for the information you gave us. In the meantime follow this link to keep in touch and maybe get some more questions answered.\n${inviteUrl}`;
    }

    await this.saveConversation({
      id: conversationId,
      messages,
      extractedFields: extracted,
      sentimentTrajectory: sentiment,
      status: "completed",
      closingMessage,
    }, callerId);

    return {
      conversationId,
      graceResponse: closingMessage,
      extractedFields: extracted,
      sentimentTrajectory: sentiment,
      escalationFlag: false,
      nextAction: "CREATE_LEAD",
      status: "completed",
      inviteUrl,
    };
  }

  /**
   * Generate invite link for the caller at SJ
   * Ports ai-grace.js's generateInviteToken() logic, adapted to use the class logger
   * and SJ's CallerType enum mapping already confirmed in clinicalScoring.js
   */
  async generateInviteLink(name, phone, callerTypeRaw) {
    if (!process.env.SJ_APP_URL || !process.env.GRACE_WEBHOOK_SECRET) {
      this.logger.error({ name, phone }, 'Cannot generate invite: missing SJ_APP_URL or GRACE_WEBHOOK_SECRET');
      return null;
    }

    // Same mapping already confirmed and used in clinicalScoring.js's
    // buildGraceLeadPayload() — SJ's CallerType enum: self | caring | professional
    const callerTypeMap = {
      adult_self: 'self',
      myself_under_18: 'self',
      family_under_18: 'caring',
      professional: 'professional',
    };
    const callerType = callerTypeMap[callerTypeRaw] || 'self';

    // SJ's invite route expects role as a SEPARATE, narrower field:
    // only "deciding" | "caring" (confirmed against the real compiled route)
    const role = callerType === 'caring' ? 'caring' : 'deciding';

    try {
      const response = await fetch(`${process.env.SJ_APP_URL}/api/invite/grace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': process.env.GRACE_WEBHOOK_SECRET,
        },
        body: JSON.stringify({ name, phone, role, source: 'grace', callerType }),
      });

      if (!response.ok) {
        this.logger.error({ status: response.status, name, phone }, 'SJ invite API returned error');
        return null;
      }

      const data = await response.json();
      this.logger.info({ name, phone, inviteUrl: data.inviteUrl, patientId: data.patientId }, 'Invite generated successfully');
      return { inviteUrl: data.inviteUrl, patientId: data.patientId, personId: data.personId };
    } catch (error) {
      this.logger.error({ error: error.message, name, phone }, 'Failed to call SJ invite API');
      return null;
    }
  }

  /**
   * Save conversation to Supabase
   * FIX #3: Improved validation and error handling
   */
  async saveConversation(data, callerId) {
    try {
      // Validate input data before saving
      if (!data.messages || !Array.isArray(data.messages)) {
        throw new Error("Messages must be an array");
      }
      
      if (data.messages.length === 0) {
        throw new Error("Cannot save empty conversation");
      }

      // Prepare payload with defensive defaults
      const payload = {
        id: data.id,
        caller_id: callerId,
        messages: data.messages,
        extracted_fields: data.extractedFields || {},
        sentiment_trajectory: data.sentimentTrajectory || 'unknown',
        status: data.status || 'in_progress',
        escalation_flag: data.escalationFlag || false,
        escalation_reason: data.escalationReason || null,
        created_at: new Date().toISOString(),
      };

      const { data: saved, error } = await this.supabase
        .from("grace_conversations")
        .upsert([payload], { onConflict: 'id' })
        .select();

      if (error) {
        this.logger.error(
          { error: error.message, payload },
          "Failed to save conversation to database"
        );
        throw new Error(`DB insert failed: ${error.message}`);
      }

      this.logger.info(
        { conversationId: data.id, messageCount: data.messages.length },
        "Conversation saved successfully"
      );

      return saved?.[0] || null;
    } catch (error) {
      this.logger.error(
        { conversationId: data.id, error: error.message },
        "Database error saving conversation"
      );
      throw error;
    }
  }

  /**
   * Retrieve conversation history by caller ID
   */
  async getConversationHistory(callerId) {
    try {
      const { data, error } = await this.supabase
        .from("grace_conversations")
        .select("*")
        .eq("caller_id", callerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows, which is fine
        throw error;
      }

      return data || null;
    } catch (error) {
      this.logger.error(
        { callerId, error: error.message },
        "Error retrieving conversation history"
      );
      return null;
    }
  }

  /**
   * Update existing conversation
   */
  async updateConversation(conversationId, messages) {
    try {
      const { error } = await this.supabase
        .from("grace_conversations")
        .update({
          messages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (error) throw error;

      this.logger.info(
        { conversationId, messageCount: messages.length },
        "Conversation updated"
      );
    } catch (error) {
      this.logger.error(
        { conversationId, error: error.message },
        "Error updating conversation"
      );
      throw error;
    }
  }

  /**
   * Get escalation response based on crisis type
   */
  getEscalationResponse(reason) {
    const responses = {
      SUICIDE_RISK: `I'm concerned about your safety. Please reach out immediately:
• Netcare 911: 082 911
• National Helpline: 10177
You matter, and there's help available.`,
      
      SELF_HARM: `I'm concerned about your safety. Please reach out immediately:
• Netcare 911: 082 911
• National Helpline: 10177
You deserve support.`,
      
      VIOLENCE_RISK: `I'm concerned about immediate danger. Please contact:
• Netcare 911: 082 911
• Police: 10177
Your safety is the priority.`,
      
      DOMESTIC_VIOLENCE: `I'm concerned about your safety. Resources available:
• National DV Line: 0800 011 588
• Netcare 911: 082 911
You're not alone.`,
      
      CHILD_ABUSE: `I'm deeply concerned. Please report immediately:
• Childline: 0800 055 555
• Netcare 911: 082 911
Protection is available.`,
      
      MEDICAL_EMERGENCY: `Please get immediate medical help:
• Netcare 911: 082 911
• Nearest Emergency Room
Your health is critical.`,
    };

    return responses[reason] || "I'm concerned about your safety. Please reach out to 082 911 or your nearest emergency service.";
  }

  /**
   * Health check - verify Claude API connectivity
   */
  async healthCheck() {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: "Hello",
          },
        ],
      });

      this.logger.info("Claude API health check passed");
      return { status: "healthy", model: this.model };
    } catch (error) {
      this.logger.error({ error: error.message }, "Claude API health check failed");
      return { status: "unhealthy", error: error.message };
    }
  }
}

export { GraceConversationEngine };
