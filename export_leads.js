/**
 * Export All Leads - Contact Information
 * 
 * Exports all 38 leads with complete contact and clinical information
 * in both CSV and formatted table format
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function exportLeads() {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error.message);
      return;
    }

    if (!leads || leads.length === 0) {
      console.log('No leads found.');
      return;
    }

    // Prepare data
    const leadsData = leads.map((lead, idx) => ({
      '#': idx + 1,
      'Created': new Date(lead.created_at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }),
      'Name': lead.contact_name || '',
      'Phone': lead.contact_phone || '',
      'Email': lead.contact_email || '',
      'City': lead.city || '',
      'Language': lead.language_preference || 'english',
      'Track': lead.track || 'unknown',
      'Urgency': lead.urgency_level || 'normal',
      'Priority': lead.urgent ? 'HIGH' : 'NORMAL',
      'Status': lead.status || 'new',
      'For Whom': lead.for_whom || lead.who_for || '',
      'Caller Relation': lead.caller_relation || '',
      'Referred Name': lead.referred_name || '',
      'Caller Type': lead.caller_type || '',
      'Involves Minor': lead.involves_minor ? 'YES' : 'No',
      'Age Band': lead.caller_age_band || 'adult',
      'Guardian Name': lead.guardian_name || '',
      'Guardian Phone': lead.guardian_phone || '',
      'Substance Primary': lead.substance_primary || '',
      'Usage Pattern': lead.usage_pattern || '',
      'Mental Health': lead.mental_health || '',
      'Medical Flags': lead.medical_flags || '',
      'Medical Aid': lead.medical_aid || '',
      'Readiness Score': lead.readiness_score || '',
      'Notes for Therapist': lead.notes_for_therapist || '',
      'MH Description': lead.mh_description || '',
      'AUDIT-C Score': lead.audit_c_score ? `${lead.audit_c_score}/12 (${lead.audit_c_tier})` : '',
      'UTM Source': lead.utm_source || '',
      'Lead ID': lead.id,
    }));

    // 1. Create detailed formatted table
    console.log('\n' + '='.repeat(150));
    console.log('📋 ALL 38 LEADS - CONTACT INFORMATION');
    console.log('='.repeat(150) + '\n');

    leadsData.forEach((lead) => {
      console.log(`┌─────────────────────────────────────────────────────────┐`);
      console.log(`│ #${String(lead['#']).padEnd(3)} | ${lead.Name.padEnd(50)} │`);
      console.log(`├─────────────────────────────────────────────────────────┤`);
      console.log(`│ Phone:          ${(lead.Phone || 'N/A').padEnd(43)} │`);
      console.log(`│ Email:          ${(lead.Email || 'N/A').padEnd(43)} │`);
      console.log(`│ City:           ${(lead.City || 'N/A').padEnd(43)} │`);
      console.log(`│ Created:        ${lead.Created.padEnd(43)} │`);
      console.log(`│ Urgency:        ${(lead.Urgency || 'N/A').padEnd(43)} │`);
      console.log(`│ Status:         ${(lead.Status || 'N/A').padEnd(43)} │`);
      console.log(`│ Track:          ${(lead.Track || 'N/A').padEnd(43)} │`);
      console.log(`│ For Whom:       ${(lead['For Whom'] || 'N/A').padEnd(43)} │`);
      console.log(`│ Relation:       ${(lead['Caller Relation'] || 'N/A').padEnd(43)} │`);
      
      if (lead['Involves Minor'] === 'YES') {
        console.log(`│ 👶 MINOR:       YES (Age: ${lead['Age Band']})${' '.repeat(30)} │`);
        console.log(`│   Guardian:     ${(lead['Guardian Name'] || 'N/A').padEnd(43)} │`);
        console.log(`│   Guardian Ph:  ${(lead['Guardian Phone'] || 'N/A').padEnd(43)} │`);
      }
      
      if (lead['Substance Primary']) {
        console.log(`│ Substance:      ${(lead['Substance Primary'] || 'N/A').padEnd(43)} │`);
        console.log(`│ Usage Pattern:  ${(lead['Usage Pattern'] || 'N/A').padEnd(43)} │`);
      }
      
      if (lead['MH Description']) {
        console.log(`│ MH Issue:       ${(lead['MH Description'].substring(0, 43) || 'N/A').padEnd(43)} │`);
      }
      
      if (lead['Medical Aid']) {
        console.log(`│ Medical Aid:    ${(lead['Medical Aid'] || 'N/A').padEnd(43)} │`);
      }
      
      if (lead['AUDIT-C Score']) {
        console.log(`│ AUDIT-C:        ${(lead['AUDIT-C Score'] || 'N/A').padEnd(43)} │`);
      }
      
      if (lead['Notes for Therapist']) {
        console.log(`│ Notes:          ${(lead['Notes for Therapist'].substring(0, 43) || 'N/A').padEnd(43)} │`);
      }
      
      console.log(`│ Lead ID:        ${lead['Lead ID'].substring(0, 43).padEnd(43)} │`);
      console.log(`└─────────────────────────────────────────────────────────┘\n`);
    });

    // 2. Create CSV export
    const csvHeaders = [
      '#', 'Created', 'Name', 'Phone', 'Email', 'City', 'Language', 'Track', 
      'Urgency', 'Priority', 'Status', 'For Whom', 'Caller Relation', 'Referred Name',
      'Caller Type', 'Involves Minor', 'Age Band', 'Guardian Name', 'Guardian Phone',
      'Substance Primary', 'Usage Pattern', 'Mental Health', 'Medical Flags', 
      'Medical Aid', 'Readiness Score', 'Notes for Therapist', 'MH Description',
      'AUDIT-C Score', 'UTM Source', 'Lead ID'
    ];

    const csvData = leadsData.map(lead => 
      csvHeaders.map(header => {
        const value = lead[header] || '';
        // Escape CSV values
        if (String(value).includes(',') || String(value).includes('"') || String(value).includes('\n')) {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    const csv = [csvHeaders.join(','), ...csvData].join('\n');

    // 3. Create Tab-separated export (for Excel paste)
    const tsvData = leadsData.map(lead => 
      csvHeaders.map(header => lead[header] || '').join('\t')
    );

    const tsv = [csvHeaders.join('\t'), ...tsvData].join('\n');

    // 4. Save to files
    const outputDir = './exports';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    fs.writeFileSync(`${outputDir}/leads-${timestamp}.csv`, csv);
    console.log(`✅ CSV export saved to: exports/leads-${timestamp}.csv`);
    
    fs.writeFileSync(`${outputDir}/leads-${timestamp}.tsv`, tsv);
    console.log(`✅ TSV export saved to: exports/leads-${timestamp}.tsv`);

    // 5. Simple copy-friendly list
    console.log('\n\n' + '='.repeat(150));
    console.log('📋 SIMPLE CONTACT LIST (Easy to Copy)');
    console.log('='.repeat(150) + '\n');

    leadsData.forEach((lead) => {
      const contact = `${lead['#']}. ${lead.Name} | ${lead.Phone}${lead.Email ? ' | ' + lead.Email : ''}`;
      console.log(contact);
    });

    // 6. Summary
    console.log('\n\n' + '='.repeat(150));
    console.log('📊 SUMMARY');
    console.log('='.repeat(150) + '\n');

    console.log(`Total Leads: ${leadsData.length}`);
    console.log(`With Phone: ${leadsData.filter(l => l.Phone).length}`);
    console.log(`With Email: ${leadsData.filter(l => l.Email).length}`);
    console.log(`With Both: ${leadsData.filter(l => l.Phone && l.Email).length}`);
    
    const byUrgency = {};
    leadsData.forEach(l => {
      byUrgency[l.Urgency] = (byUrgency[l.Urgency] || 0) + 1;
    });
    console.log('\nBy Urgency Level:');
    Object.entries(byUrgency).forEach(([urg, count]) => {
      console.log(`  ${urg}: ${count}`);
    });

    const byTrack = {};
    leadsData.forEach(l => {
      byTrack[l.Track] = (byTrack[l.Track] || 0) + 1;
    });
    console.log('\nBy Track:');
    Object.entries(byTrack).forEach(([track, count]) => {
      console.log(`  ${track}: ${count}`);
    });

    const minors = leadsData.filter(l => l['Involves Minor'] === 'YES').length;
    console.log(`\nMinors Involved: ${minors}`);

    console.log('\n' + '='.repeat(150) + '\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

exportLeads();
