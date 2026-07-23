import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const { data } = await supabase
  .from("conversations")
  .select("id, session_id, created_at, messages")
  .order("created_at", { ascending: false })
  .limit(5);

console.log("=== 5 MOST RECENT CONVERSATIONS ===\n");

data.forEach((conv, idx) => {
  const msgCount = conv.messages.length;
  const firstRole = conv.messages[0].role;
  const lastRole = conv.messages[msgCount - 1].role;
  const preview = conv.messages[msgCount - 1].content.substring(0, 60);

  console.log(`Conversation ${idx + 1}:`);
  console.log(`  Session: ${conv.session_id}`);
  console.log(`  Created: ${conv.created_at}`);
  console.log(`  Messages: ${msgCount} (${firstRole} → ${lastRole})`);
  console.log(`  Latest: "${preview}..."`);
  console.log();
});
