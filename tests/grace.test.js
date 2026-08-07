/**
 * Grace Conversation Engine Tests
 * 
 * Run with: npm test
 */

import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { GraceConversationEngine } from "../src/conversationEngine.js";
import { extractFieldsFromConversation } from "../src/fieldExtractor.js";
import { detectEscalation } from "../src/escalationDetector.js";

describe("Grace Conversation Engine", () => {
  let engine;
  let mockSupabase;
  let mockLogger;

  beforeEach(() => {
    // Mock Supabase
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: [{}], error: null }),
      update: jest.fn().mockResolvedValue({ data: [], error: null }),
      upsert: jest.fn().mockReturnThis(),
    };

    // Mock Logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    engine = new GraceConversationEngine(mockSupabase, mockLogger);
  });

  describe("Escalation Detection", () => {
    it("should detect suicide risk", () => {
      const { escalated, reason } = detectEscalation("I want to kill myself");
      expect(escalated).toBe(true);
      expect(reason).toBe("SUICIDE_RISK");
    });

    it("should detect self-harm", () => {
      const { escalated, reason } = detectEscalation("I'm cutting myself");
      expect(escalated).toBe(true);
      expect(reason).toBe("SELF_HARM");
    });

    it("should detect domestic violence", () => {
      const { escalated, reason } = detectEscalation("My partner hits me");
      expect(escalated).toBe(true);
      expect(reason).toBe("DOMESTIC_VIOLENCE");
    });

    it("should not escalate normal messages", () => {
      const { escalated } = detectEscalation("I've been drinking too much");
      expect(escalated).toBe(false);
    });
  });

  describe("Field Extraction", () => {
    it("should extract name from introduction", async () => {
      const messages = [
        { role: "user", content: "Hi, my name is James" },
      ];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.name?.value).toBe("James");
    });

    it("should NOT extract common words as names (false positive fix)", async () => {
      const messages = [
        { role: "user", content: "I'm worried about my drinking" },
      ];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.name?.value).toBeNull();
    });

    it("should extract phone number", async () => {
      const messages = [
        { role: "user", content: "Call me at 0821234567" },
      ];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.phone?.value).toBe("0821234567");
    });

    it("should extract substance", async () => {
      const messages = [
        { role: "user", content: "I've been drinking alcohol every day" },
      ];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.primary_substance?.value).toBe("alcohol");
    });

    it("should infer multiple substances", async () => {
      const messages = [
        { role: "user", content: "I drink alcohol and also use cocaine" },
      ];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.primary_substance?.value).toBe("multiple");
    });

    it("should infer urgency from language", async () => {
      const messages = [
        { role: "user", content: "I can't stop drinking, I'm missing work" },
      ];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.urgency_level?.value).toBe("URGENT");
    });

    it("should extract city", async () => {
      const messages = [
        { role: "user", content: "I'm calling from Johannesburg" },
      ];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.city_town?.value).toMatch(/johannesburg/i);
    });

    it("should extract phone number with spaces (formatted SA number)", async () => {
      const messages = [{ role: "user", content: "072 456 7890" }];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.phone?.value).toBe("0724567890");
    });

    it("should extract phone number with dashes", async () => {
      const messages = [{ role: "user", content: "You can reach me on 083-999-1234" }];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.phone?.value).toBe("0839991234");
    });

    it("should extract phone number with parentheses", async () => {
      const messages = [{ role: "user", content: "(072) 123-4567" }];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.phone?.value).toBe("0721234567");
    });

    it("should extract international +27 with spaces", async () => {
      const messages = [{ role: "user", content: "+27 72 123 4567" }];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.phone?.value).toBe("0721234567");
    });

    it("should extract international 27 without + prefix", async () => {
      const messages = [{ role: "user", content: "27821234567" }];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.phone?.value).toBe("0821234567");
    });

    it("should extract phone from a natural sentence with context keyword", async () => {
      const messages = [{ role: "user", content: "My number is 076 543 2100, call me anytime" }];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.phone?.value).toBe("0765432100");
    });

    it("should extract bare name reply after Grace asks for name", async () => {
      const messages = [
        { role: "assistant", content: "What is your name?" },
        { role: "user", content: "Maria" },
      ];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.name?.value).toBe("Maria");
    });

    it("should extract bare name (lowercase) after Grace asks, and capitalise it", async () => {
      const messages = [
        { role: "assistant", content: "May I ask what to call you?" },
        { role: "user", content: "peter" },
      ];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.name?.value).toBe("Peter");
    });

    it("should NOT extract stopword as bare name reply after name question", async () => {
      const messages = [
        { role: "assistant", content: "May I ask your name?" },
        { role: "user", content: "worried" },
      ];
      const extracted = await extractFieldsFromConversation(messages);
      expect(extracted.name?.value).toBeNull();
    });
  });

  describe("Conversation Flow", () => {
    it("should handle incomplete conversation", async () => {
      const messages = [
        { role: "user", content: "Hi, I need help" },
      ];

      // Mock Claude response
      engine.client.messages.create = jest.fn().mockResolvedValue({
        content: [{ text: "Tell me more about that" }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const result = await engine.conductIntake("test-caller", messages);
      expect(result.nextAction).toBe("CONTINUE_CONVERSATION");
      expect(result.graceResponse).toBeDefined();
    });
  });
});
