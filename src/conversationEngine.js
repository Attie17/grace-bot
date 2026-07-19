/**
 * Grace Conversation Engine - CORRECTED
 * 
 * Orchestrates the full intake conversation flow.
 * Handles:
 * - Message history
 * - Claude Sonnet API calls
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

class GraceConversationEngine {
  constructor(supabaseClient, logger) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = "claude-sonnet-4-6";
    this.systemPrompt = GRACE_SYSTEM_PROMPT;
    this.supabase = supabaseClient;
    this.logger = logger;
    this.maxExchanges = 20; // ~12-15 min conversation
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

      // Check if conversation is complete (15+ exchanges = ~12 min)
      if (messages.length >= this.maxExchanges) {
        this.logger.info(
          { conversationId, exchanges: messages.length },
          "Max exchanges reached, wrapping up"
        );

        const wrappedUp = await this.wrapUpConversation(
          messages,
          conversationId
        );
        return wrappedUp;
      }

      // Generate Grace response
      const graceResponse = await this.generateResponse(messages);

      // Extract fields from full conversation so far
      const extracted = await extractFieldsFromConversation(messages, this.client);
      const sentiment = await analyzeSentimentTrajectory(messages);

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
  async wrapUpConversation(messages, conversationId) {
    const extracted = await extractFieldsFromConversation(messages, this.client);
    const sentiment = await analyzeSentimentTrajectory(messages);

    // Generate final summary response
    const summaryPrompt = `Based on this conversation, provide a brief, warm closing message (2-3 sentences). 
Confirm next steps and include emergency numbers if appropriate.
Use the caller's own language. Be warm and hopeful.`;

    // Make final Claude call
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

    const closingMessage = response.content[0].text;

    // Save conversation to database
    await this.saveConversation({
      id: conversationId,
      messages,
      extractedFields: extracted,
      sentimentTrajectory: sentiment,
      status: "completed",
      closingMessage,
    });

    return {
      conversationId,
      graceResponse: closingMessage,
      extractedFields: extracted,
      sentimentTrajectory: sentiment,
      escalationFlag: false,
      nextAction: "CREATE_LEAD",
      status: "completed",
    };
  }

  /**
   * Save conversation to Supabase
   * FIX #3: Improved validation and error handling
   */
  async saveConversation(data) {
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
        .insert([payload]);

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

      return saved[0];
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
