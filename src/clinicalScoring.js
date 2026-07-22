/**
 * Clinical Scoring & Derivation Functions
 * 
 * These functions convert raw intake data into clinical scores and program assignments.
 * VALIDATION DATE: 2026-07-20
 * All thresholds should be reviewed against actual outcomes quarterly.
 */

// ============================================================================
// 1. UNIFIED HIGH-RISK SUBSTANCE LIST
// ============================================================================
// Used by both deriveProgrammeFromRisk() and inferMentalHealthStatus()
const HIGH_RISK_SUBSTANCES = ['heroin', 'methamphetamine', 'cocaine', 'crack'];

// ============================================================================
// 2. READINESS SCORE MAPPING
// ============================================================================
/**
 * Map readiness statement to numeric score (1-10 scale)
 * ⚠️ VALIDATION NOTE: These scores were set on 2026-07-20.
 * Monitor actual admission outcomes and therapist feedback for 3 months.
 * Adjust if thresholds don't match your clinical experience.
 */
function mapReadinessToScore(readinessValue) {
  const scoreMap = {
    "Determined": 9,           // 90% ready
    "Contemplative": 5,        // 50% ready
    "Resistant": 2,            // 20% ready
    "Unknown": 5               // Default: uncertain
  };
  return scoreMap[readinessValue] || 5;
}

// ============================================================================
// 3. URGENCY NORMALIZATION
// ============================================================================
/**
 * Normalize urgency levels to database enum
 * CRISIS and URGENT both map to "immediate" for triage purposes
 */
function mapUrgencyToDatabase(urgencyLevel) {
  const urgencyMap = {
    "CRISIS": "immediate",
    "URGENT": "immediate",
    "SOON": "soon",
    "EXPLORING": "planning",
    "UNKNOWN": "researching"
  };
  return urgencyMap[urgencyLevel] || "researching";
}

// ============================================================================
// 4. PROGRAMME DERIVATION
// ============================================================================
/**
 * Derive recommended programme based on urgency + risk profile
 * 
 * RETURNS: { value: string, needsReview: boolean, reviewReason: string|null }
 * 
 * Logic:
 * - CRISIS/URGENT + high-risk → inpatient_acute (with review flag if minor)
 * - CRISIS/URGENT + low-risk → inpatient_standard (with review flag if minor)
 * - SOON + high-risk → inpatient_standard
 * - SOON + low-risk → outpatient_intensive
 * - Minor (non-crisis) → adolescent track
 * - EXPLORING → outpatient_standard or wellness
 * 
 * When involvesMinor is TRUE and urgencyLevel is CRISIS or URGENT:
 * Provide best-guess provisional recommendation BUT flag for mandatory
 * therapist confirmation (needsReview: true). The therapist must verify
 * whether standard adult acute placement is appropriate or if an
 * adolescent-specific track is needed.
 */
function deriveProgrammeFromRisk(urgencyLevel, substancePrimary, involvesMinor) {
  const isHighRisk = HIGH_RISK_SUBSTANCES.includes((substancePrimary || '').toLowerCase());
  
  // Crisis/urgent + high-risk → inpatient acute
  if ((urgencyLevel === "CRISIS" || urgencyLevel === "URGENT") && isHighRisk) {
    const needsReview = involvesMinor;
    const reviewReason = needsReview 
      ? `CONFIRM: minor in crisis/urgent with high-risk substance — verify placement (standard inpatient_acute vs adolescent-specific track) before proceeding.`
      : null;
    return {
      value: "inpatient_acute",
      needsReview,
      reviewReason
    };
  }
  
  // Crisis/urgent (any substance) → inpatient standard
  if (urgencyLevel === "CRISIS" || urgencyLevel === "URGENT") {
    const needsReview = involvesMinor;
    const reviewReason = needsReview
      ? `CONFIRM: minor in crisis/urgent with substance use — verify placement (standard inpatient_standard vs adolescent-specific track) before proceeding.`
      : null;
    return {
      value: "inpatient_standard",
      needsReview,
      reviewReason
    };
  }
  
  // SOON urgency with risk differentiation
  if (urgencyLevel === "SOON") {
    if (isHighRisk) {
      return {
        value: "inpatient_standard",
        needsReview: false,
        reviewReason: null
      };
    }
    return {
      value: "outpatient_intensive",
      needsReview: false,
      reviewReason: null
    };
  }
  
  // Non-crisis minor → adolescent track
  if (involvesMinor) {
    return {
      value: "adolescent",
      needsReview: false,
      reviewReason: null
    };
  }
  
  // EXPLORING or lower → outpatient standard (or wellness track)
  if (substancePrimary === "digital" || substancePrimary === "behavioral") {
    return {
      value: "wellness",
      needsReview: false,
      reviewReason: null
    };
  }
  
  return {
    value: "outpatient_standard",
    needsReview: false,
    reviewReason: null
  };
}

// ============================================================================
// 5. MENTAL HEALTH INFERENCE (NOW CONSERVATIVE ONLY)
// ============================================================================
/**
 * Infer mental health status from explicit signals only
 * 
 * CLINICAL BOUNDARY: AI never makes autonomous risk assessments.
 * This function ONLY returns "suspected" if medicalConditions explicitly
 * includes "mental_health". Otherwise "unknown".
 * 
 * Removed inference from crisis+substance combination — that assessment
 * belongs to the therapist, not the intake AI.
 */
function inferMentalHealthStatus(medicalConditions) {
  // Explicit mental health mention → suspected
  if (medicalConditions && medicalConditions.includes("mental_health")) {
    return "suspected";
  }
  
  // Default: insufficient data for AI assessment
  return "unknown";
}

// ============================================================================
// 6. MEDICAL FLAGS FORMATTING
// ============================================================================
/**
 * Format medical conditions array as database string
 * Uses pipe separator for clean parsing in SQL
 */
function formatMedicalFlags(conditionsArray) {
  if (!conditionsArray || conditionsArray.length === 0) {
    return "none";
  }
  
  // Clean and join with pipe
  return conditionsArray
    .filter(c => c && typeof c === 'string')
    .map(c => c.trim().toLowerCase())
    .join(" | ");
}

// ============================================================================
// 7. for_whom NORMALIZATION
// ============================================================================
/**
 * Normalize for_whom field to database enum: ['self', 'family', 'friend', 'employer']
 * 
 * INPUT: Raw values from fieldExtractor.js's extractWhoFor()
 *   - "self": caller about themselves (adult)
 *   - "self_under_18": caller is a minor (minor status handled separately via involves_minor)
 *   - "child": caller about their child
 *   - "partner": caller about partner/spouse
 *   - "family_or_friend": ambiguous match (friend/sibling/family member keyword)
 *   - "unknown": no match in conversation
 *   - anything else: unrecognized value
 *
 * RETURNS: { value: string, needsReview: boolean, reviewReason?: string }
 * 
 * NOTE: Minor signal (involves_minor) is extracted separately by 
 * fieldExtractor.js and merges in independently. This function only
 * normalizes the for_whom enum value itself.
 */
function normalizeForWhom(whoForValue) {
  if (!whoForValue) {
    return { 
      value: "self", 
      needsReview: true, 
      reviewReason: "for_whom was empty — therapist should confirm who this intake is for" 
    };
  }
  
  const normalized = whoForValue.toLowerCase().trim();
  
  // Direct mappings from fieldExtractor.js extractWhoFor()
  if (normalized === "self") {
    return { value: "self", needsReview: false };
  }
  
  if (normalized === "self_under_18") {
    // Minor status is a SEPARATE field (involves_minor) — this just produces the enum
    return { value: "self", needsReview: false };
  }
  
  if (normalized === "child") {
    return { value: "family", needsReview: false };
  }
  
  if (normalized === "partner") {
    return { value: "family", needsReview: false };
  }
  
  // AMBIGUOUS CASE: fieldExtractor matched friend/sibling/family_member keyword
  // but can't distinguish which — flag for therapist to clarify
  if (normalized === "family_or_friend") {
    return { 
      value: "family", 
      needsReview: true, 
      reviewReason: "ambiguous: fieldExtractor returned 'family_or_friend' (matched on friend/sibling/family_member keyword) — therapist should clarify exact relationship during callback" 
    };
  }
  
  // No match found — uncertain
  if (normalized === "unknown") {
    return { 
      value: "self", 
      needsReview: true, 
      reviewReason: "for_whom could not be determined from conversation — therapist should confirm who this intake is for" 
    };
  }
  
  // Unrecognized value — unexpected output from fieldExtractor
  return { 
    value: "self", 
    needsReview: true, 
    reviewReason: `unrecognized for_whom value: "${whoForValue}" — therapist should clarify` 
  };
}

// ============================================================================
// 8. ADAPTER: fieldExtractor OUTPUT → calculateClinicalScores INPUT
// ============================================================================
/**
 * Adapts fieldExtractor.js's raw output — where every field is wrapped
 * as {value, confidence, source} — into the flat, plain-value shape
 * calculateClinicalScores() expects. Also renames three fields whose
 * names differ between the two files.
 *
 * Confirmed against fieldExtractor.js source, 2026-07-19:
 *   who_for.value                  → for_whom
 *   primary_substance.value        → substance_primary
 *   readiness_for_treatment.value  → readiness
 *   medical_conditions.value       → medical_conditions (array or null, no rename)
 *   involves_minor.value           → involves_minor (no rename)
 *   urgency_level.value            → urgency_level (no rename)
 *
 * @param {Object} extracted - fieldExtractor.js's raw output with {name: {value, confidence, source}, ...} shape
 * @returns {Object} Flat brief object: {for_whom, substance_primary, readiness, medical_conditions, involves_minor, urgency_level}
 */
function adaptExtractedFieldsToBrief(extracted) {
  const unwrap = (field) => (field && 'value' in field) ? field.value : null;

  return {
    for_whom: unwrap(extracted.who_for),
    substance_primary: unwrap(extracted.primary_substance),
    readiness: unwrap(extracted.readiness_for_treatment),
    medical_conditions: unwrap(extracted.medical_conditions),
    involves_minor: unwrap(extracted.involves_minor),
    urgency_level: unwrap(extracted.urgency_level),
  };
}

// ============================================================================
// 9. CALCULATE ALL CLINICAL SCORES
// ============================================================================
/**
 * Build complete clinical scores object from fieldExtractor.js's raw output
 * 
 * Internally converts the {name: {value, confidence, source}} shape into
 * a flat brief using adaptExtractedFieldsToBrief(), then derives scores.
 * 
 * Returns:
 * - readiness_score (1-10)
 * - recommended_programme (with needsReview flag)
 * - mental_health (inferred if needed)
 * - medical_flags (formatted)
 * - for_whom (normalized, with needsReview flag)
 * - urgency (database enum)
 * - review_flags (array of strings for therapist review)
 *
 * @param {Object} extractedFields - fieldExtractor.js's raw extracted-fields output
 *        Shape: {name: {value, confidence, source}, ...} from extractFieldsFromConversation()
 * @returns {Object} Clinical scores with all derived fields and review flags
 * 
 * SCOPE: This module is for the NEW Grace system (fieldExtractor.js /
 * conversationEngine.js path) only. The future field-mapping adapter
 * between fieldExtractor and createLead() will consume review_flags
 * and merge them into notes_for_therapist before database insert.
 */
function calculateClinicalScores(extractedFields) {
  // Convert fieldExtractor.js's wrapped format to flat brief
  const brief = adaptExtractedFieldsToBrief(extractedFields);

  const forWhomResult = normalizeForWhom(brief.for_whom);
  const programmeResult = deriveProgrammeFromRisk(
    brief.urgency_level,
    brief.substance_primary,
    brief.involves_minor
  );
  
  // Collect all review flags across the scores object
  const reviewFlags = [];
  
  if (forWhomResult.needsReview && forWhomResult.reviewReason) {
    reviewFlags.push(`[for_whom] ${forWhomResult.reviewReason}`);
  }
  
  if (programmeResult.needsReview && programmeResult.reviewReason) {
    reviewFlags.push(`[programme] ${programmeResult.reviewReason}`);
  }
  
  return {
    readiness_score: mapReadinessToScore(brief.readiness),
    recommended_programme: programmeResult.value,
    mental_health: inferMentalHealthStatus(brief.medical_conditions),
    medical_flags: formatMedicalFlags(brief.medical_conditions),
    for_whom: forWhomResult.value,
    urgency: mapUrgencyToDatabase(brief.urgency_level),
    
    // Review flags array — future field-mapping adapter will append to notes_for_therapist
    review_flags: reviewFlags
  };
}

// ============================================================================
// 10. BUILD PAYLOAD FOR SOBRIETY JOURNEY API
// ============================================================================
/**
 * Build the exact payload shape required by POST /api/webhooks/grace/lead
 * on the Sobriety Journey app. Performs all necessary translation and enum
 * mapping between fieldExtractor's vocabulary and SJ's database schema.
 *
 * Confirmed directly against SJ Prisma schema and route handler code.
 *
 * @param {Object} extractedFields - fieldExtractor.js's raw extracted-fields output
 *        Shape: {name: {value, confidence, source}, ...} from extractFieldsFromConversation()
 * @param {string} graceLeadId - Grace's internal lead ID (will be stored as grace_lead_id in SJ)
 * @returns {Object} Complete lead payload matching SJ's POST /api/webhooks/grace/lead schema
 */
function buildGraceLeadPayload(extractedFields, graceLeadId) {
  const unwrap = (field) => (field && 'value' in field) ? field.value : null;

  // --- Translation: fieldExtractor's who_for vocabulary → SJ's whoFor enum ---
  // SJ expects: myself | someone_else | professional
  const whoForRaw = unwrap(extractedFields.who_for);
  const whoForMap = {
    self: 'myself',
    self_under_18: 'myself',
    child: 'someone_else',
    partner: 'someone_else',
    family_or_friend: 'someone_else',
    unknown: 'myself', // safest default per confirmed schema
  };
  const whoFor = whoForMap[whoForRaw] || 'myself';

  // --- Translation: fieldExtractor's urgency_level → SJ's urgencyLevel enum ---
  // SJ expects: crisis | urgent | normal (lowercase)
  const urgencyRaw = unwrap(extractedFields.urgency_level);
  const urgencyMap = {
    CRISIS: 'crisis',
    URGENT: 'urgent',
    SOON: 'normal',
    EXPLORING: 'normal',
    UNKNOWN: 'normal',
  };
  const urgencyLevel = urgencyMap[urgencyRaw] || 'normal';

  // --- Translation: fieldExtractor's caller_type → SJ's CallerType enum ---
  // SJ expects: self | caring | professional (real Prisma enum — wrong value = hard error)
  const callerTypeRaw = unwrap(extractedFields.caller_type);
  const callerTypeMap = {
    adult_self: 'self',
    myself_under_18: 'self',
    family_under_18: 'caring',
    professional: 'professional',
  };
  const callerType = callerTypeMap[callerTypeRaw] || 'self';

  // --- Derivation: callerAgeBand (SJ expects: adult | minor_self | minor_other) ---
  const involvesMinor = unwrap(extractedFields.involves_minor) === true;
  let callerAgeBand = 'adult';
  if (whoForRaw === 'self_under_18' || callerTypeRaw === 'myself_under_18') {
    callerAgeBand = 'minor_self';
  } else if (involvesMinor) {
    callerAgeBand = 'minor_other';
  }

  const substancePrimary = unwrap(extractedFields.primary_substance);

  return {
    grace_lead_id: graceLeadId,
    contact_name: unwrap(extractedFields.name),
    contact_phone: unwrap(extractedFields.phone),
    contact_email: null, // not collected by conversational Grace
    track: unwrap(extractedFields.track),
    who_for: whoFor,
    caller_relation: unwrap(extractedFields.caller_relation),
    referred_name: unwrap(extractedFields.referred_name),
    urgency_level: urgencyLevel,
    involves_minor: involvesMinor,
    caller_age_band: callerAgeBand,
    guardian_name: unwrap(extractedFields.guardian_name),
    guardian_phone: unwrap(extractedFields.guardian_phone),
    funding_source: unwrap(extractedFields.funding_source), // vocab already matches, confirmed
    medical_aid: null, // fieldExtractor has medical_aid_type, different concept — needs its own review
    medical_aid_name: null, // not collected
    city: unwrap(extractedFields.city_town),
    substance_primary: substancePrimary,
    previous_treatment: unwrap(extractedFields.previous_treatment),
    health_notes: null, // confirmed gap — no free-text health notes collected by new system
    mh_description: null, // same — no equivalent field exists
    caller_type: callerType,
    utm_source: null, // must come from server.js/widget URL params, not conversation
    utm_medium: null,
    utm_campaign: null,
    audit_c_q1: null, // dropped from Grace's scope, confirmed decision
    audit_c_q2: null,
    audit_c_q3: null,
    audit_c_score: null,
    audit_c_tier: null,
    struggle: substancePrimary, // confirmed alias of substance_primary in old system
  };
}

export {
  HIGH_RISK_SUBSTANCES,
  mapReadinessToScore,
  mapUrgencyToDatabase,
  deriveProgrammeFromRisk,
  inferMentalHealthStatus,
  formatMedicalFlags,
  normalizeForWhom,
  adaptExtractedFieldsToBrief,
  calculateClinicalScores,
  buildGraceLeadPayload
};
