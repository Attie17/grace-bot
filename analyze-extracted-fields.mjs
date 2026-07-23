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
  .eq("session_id", "web_1783449337837_ijfv2zy");

const conv = data[0];

console.log("=== ATTIE TEST CONVERSATION - EXTRACTED FIELDS ANALYSIS ===\n");
console.log("Session ID:", conv.session_id);
console.log("Messages:", conv.messages.length);
console.log("Created:", conv.created_at);
console.log("\n--- EXTRACTED FIELDS JSON ---\n");

const extractedFields = conv.metadata?.collectedData || {};
console.log(JSON.stringify(extractedFields, null, 2));

console.log("\n--- SENTIMENT TRAJECTORY ---\n");
console.log(
  "Sentiment Trajectory:",
  conv.metadata?.sentiment_trajectory || "NOT STORED"
);

console.log("\n--- ESCALATION ANALYSIS ---\n");
console.log("Escalation Flag:", conv.metadata?.collectedData?.crisis);
console.log("Urgency Level:", conv.metadata?.collectedData?.urgency);
console.log("Triage Path:", conv.metadata?.collectedData?.triage_path);

console.log("\n--- FULL METADATA ---\n");
console.log(JSON.stringify(conv.metadata, null, 2));
