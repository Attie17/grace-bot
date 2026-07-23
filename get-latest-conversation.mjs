import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getLatestConversation() {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("❌ Error:", error);
      return;
    }

    const conv = data[0];
    console.log("=== MOST RECENT CONVERSATION ===\n");
    console.log("ID:", conv.id);
    console.log("Session:", conv.session_id);
    console.log("Created:", conv.created_at);
    console.log("\n--- FULL CONVERSATION ---\n");

    conv.messages.forEach((m) => {
      console.log(`[${m.role.toUpperCase()}]:`);
      console.log(m.content);
      console.log();
    });

    console.log("--- EXTRACTED METADATA ---");
    console.log(JSON.stringify(conv.metadata, null, 2));
  } catch (err) {
    console.error("Exception:", err.message);
  }
}

getLatestConversation();
