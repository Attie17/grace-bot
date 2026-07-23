import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Search for conversations with "Attie Test" or heroin
const { data: allConvs } = await supabase
  .from("conversations")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(20);

console.log("=== SEARCHING FOR 'ATTIE TEST' OR HEROIN ===\n");

const matches = allConvs.filter((conv) => {
  const fullText = JSON.stringify(conv).toLowerCase();
  return (
    fullText.includes("attie test") ||
    fullText.includes("heroin") ||
    fullText.includes("heroine")
  );
});

if (matches.length === 0) {
  console.log(
    "❌ NOT FOUND: No conversations with 'Attie Test' or heroin detected.\n"
  );
  console.log("=== LAST 10 CONVERSATIONS (checking timestamps) ===\n");

  allConvs.slice(0, 10).forEach((conv, idx) => {
    console.log(`${idx + 1}. Session: ${conv.session_id}`);
    console.log(`   Created: ${conv.created_at}`);
    console.log(`   Messages: ${conv.messages.length}`);
    console.log(`   Name: ${conv.metadata?.collectedData?.name || "N/A"}`);
    console.log(
      `   Substance: ${conv.metadata?.collectedData?.struggle || "N/A"}`
    );
    console.log();
  });
} else {
  console.log(`✅ FOUND ${matches.length} matching conversation(s):\n`);
  matches.forEach((conv, idx) => {
    console.log(`=== Match ${idx + 1} ===`);
    console.log(`Session: ${conv.session_id}`);
    console.log(`Created: ${conv.created_at}`);
    console.log(`Messages: ${conv.messages.length}`);
    console.log(`Name: ${conv.metadata?.collectedData?.name}`);
    console.log(`Substance: ${conv.metadata?.collectedData?.struggle}`);
    console.log();
  });
}
