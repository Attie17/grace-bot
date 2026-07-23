import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const leadId = "d07f0250-d7d8-4fd9-8a5d-16c15d7b4937";

console.log(`\n=== SEARCHING FOR LEAD ID: ${leadId} ===\n`);

// Search in leads table
const { data: leadData, error: leadError } = await supabase
  .from("leads")
  .select("*")
  .eq("id", leadId);

if (leadError) {
  console.log("❌ Error querying leads table:", leadError);
} else if (!leadData || leadData.length === 0) {
  console.log("❌ Lead not found in leads table");
  console.log("\nLet me check if it exists with a different ID field...\n");

  // Try searching by any field containing the ID
  const { data: allLeads } = await supabase
    .from("leads")
    .select("*")
    .limit(5);

  if (allLeads && allLeads.length > 0) {
    console.log("Sample leads structure:");
    console.log(JSON.stringify(allLeads[0], null, 2));
  }
} else {
  console.log("✅ LEAD FOUND!\n");
  console.log(JSON.stringify(leadData[0], null, 2));
}
