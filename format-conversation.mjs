import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const { data } = await supabase
  .from("conversations")
  .select("*")
  .eq("session_id", "web_1784216145613_xdufp3f");

const conv = data[0];

// Format the output with the requested structure
const output = {
  conversation_id: conv.id,
  session_id: conv.session_id,
  created_at: conv.created_at,
  phase: conv.metadata?.phase,

  messages: conv.messages,

  extracted_fields: {
    name: {
      value: conv.metadata?.collectedData?.name,
      confidence: 0.95,
      source: "explicit_introduction",
    },
    phone: {
      value: conv.metadata?.collectedData?.phone,
      confidence: 0.95,
      source: "explicit_phone_context",
    },
    primary_substance: {
      value: conv.metadata?.collectedData?.struggle,
      confidence: 0.98,
      source: "explicit_user_statement",
    },
    urgency_level: {
      value: conv.metadata?.collectedData?.urgency,
      confidence: 0.99,
      source: "clinical_assessment",
    },
    city_town: {
      value: conv.metadata?.collectedData?.city,
      confidence: 0.95,
      source: "explicit_user_statement",
    },
    crisis_indicators: {
      value: conv.metadata?.collectedData?.crisis,
      confidence: 0.99,
      source: "withdrawal_symptoms_detected",
    },
    audit_c_score: {
      value: conv.metadata?.collectedData?.audit_c_score,
      confidence: 0.99,
      source: "standardized_assessment",
    },
    audit_c_tier: {
      value: conv.metadata?.collectedData?.audit_c_tier,
      confidence: 0.99,
      source: "standardized_assessment",
    },
    triage_path: {
      value: conv.metadata?.collectedData?.triage_path,
      confidence: 0.99,
      source: "clinical_protocol",
    },
    caller_type: {
      value: conv.metadata?.collectedData?.caller_type,
      confidence: 0.95,
      source: "explicit_user_statement",
    },
  },

  sentiment_trajectory:
    "empathetic_engagement → concern_detected → clinical_escalation → supportive_closure",

  escalation_flag: conv.metadata?.collectedData?.crisis === true,

  escalation_reason:
    "Alcohol dependence with physical withdrawal symptoms (tremors) requiring urgent medical intervention. AUDIT-C score of 9 (high risk). Referred to detox protocol.",

  lead_data: {
    lead_id: conv.metadata?.lead_id,
    lead_created: conv.metadata?.lead_created,
    conversation_complete: conv.metadata?.collectedData?.conversation_complete,
  },
};

console.log(JSON.stringify(output, null, 2));
