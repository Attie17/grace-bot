import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkConversations() {
  try {
    const { data, error } = await supabase
      .from("grace_conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ Error querying grace_conversations:", error);
      return;
    }

    if (!data || data.length === 0) {
      console.log(
        "✓ No conversations found in grace_conversations table yet."
      );
      return;
    }

    console.log(`✓ Found ${data.length} conversation(s) in database:\n`);
    data.forEach((conv, index) => {
      console.log(`--- Conversation ${index + 1} ---`);
      console.log(`ID: ${conv.id}`);
      console.log(`Caller ID: ${conv.caller_id}`);
      console.log(`Status: ${conv.status}`);
      console.log(`Created: ${conv.created_at}`);
      console.log(`Messages: ${conv.messages?.length || 0}`);
      console.log(
        `Extracted Fields: ${JSON.stringify(conv.extracted_fields, null, 2)}`
      );
      console.log(`Escalation Flag: ${conv.escalation_flag}`);
      console.log();
    });
  } catch (err) {
    console.error("❌ Unexpected error:", err.message);
  }
}

checkConversations();
