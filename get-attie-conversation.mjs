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

console.log("=== COMPLETE CONVERSATION - ATTIE INTAKE ===\n");
console.log("Session: " + conv.session_id);
console.log("Date: " + conv.created_at);
console.log("\n--- CONVERSATION TRANSCRIPT ---\n");

conv.messages.forEach((m, idx) => {
  console.log(`[${idx + 1}] ${m.role.toUpperCase()}:`);
  console.log(m.content);
  console.log();
});

console.log("--- METADATA & EXTRACTED FIELDS ---");
console.log(JSON.stringify(conv.metadata, null, 2));
