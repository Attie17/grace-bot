/**
 * Escalation Detector - CORRECTED VERSION
 * 
 * Fixes:
 * - Better pattern matching with context words
 * - Negation detection ("I'm not suicidal")
 * - Weight-based confidence scoring
 * - Avoids false positives ("kill it at the gym")
 */

function detectEscalation(message) {
  if (!message || typeof message !== "string") {
    return { escalated: false, reason: null, confidence: 0 };
  }

  const text = message.toLowerCase();
  const escalations = [];

  // FIX #4: Improved pattern matching with context
  const checks = [
    {
      reason: "SUICIDE_RISK",
      check: () => checkSuicideRisk(text),
    },
    {
      reason: "SELF_HARM",
      check: () => checkSelfHarm(text),
    },
    {
      reason: "VIOLENCE_RISK",
      check: () => checkViolenceRisk(text),
    },
    {
      reason: "DOMESTIC_VIOLENCE",
      check: () => checkDomesticViolence(text),
    },
    {
      reason: "CHILD_ABUSE",
      check: () => checkChildAbuse(text),
    },
    {
      reason: "MEDICAL_EMERGENCY",
      check: () => checkMedicalEmergency(text),
    },
  ];

  // Run all checks and collect results with confidence
  for (const { reason, check } of checks) {
    const result = check();
    if (result.escalated) {
      escalations.push({
        reason,
        confidence: result.confidence,
      });
    }
  }

  // Return highest confidence escalation
  if (escalations.length > 0) {
    const highest = escalations.sort(
      (a, b) => b.confidence - a.confidence
    )[0];
    return {
      escalated: true,
      reason: highest.reason,
      confidence: highest.confidence,
    };
  }

  return { escalated: false, reason: null, confidence: 0 };
}

/**
 * Check for suicide risk with context awareness
 * FIX #4: Include common phrasings, check for negation
 */
function checkSuicideRisk(text) {
  // Critical keywords
  const criticalWords = [
    "suicide",
    "kill myself",
    "end my life",
    "no reason to live",
  ];

  // Context words that strengthen
  const contextWords = [
    "want to",
    "going to",
    "thinking about",
    "seriously",
    "can't go on",
  ];

  // Negation words that weaken
  const negationWords = ["not", "never", "wouldn't", "don't"];

  // Check for critical keywords
  let hasCritical = criticalWords.some((word) =>
    text.includes(word)
  );

  // Check for context strengthening
  let hasContext = contextWords.some((word) => text.includes(word));

  // Check for negation
  let hasNegation = false;
  for (const negWord of negationWords) {
    // Simple check: negation within 3 words of critical
    if (new RegExp(`${negWord}\\s+\\w+\\s+\\w+\\s+.*?suicide`).test(text)) {
      hasNegation = true;
    }
  }

  // Calculate confidence
  if (hasCritical && hasContext && !hasNegation) {
    return { escalated: true, confidence: 0.95 };
  }

  if (hasCritical && !hasNegation) {
    return { escalated: true, confidence: 0.85 };
  }

  return { escalated: false, confidence: 0 };
}

/**
 * Check for self-harm
 */
function checkSelfHarm(text) {
  const harmWords = [
    "cutting",
    "cut myself",
    "harm myself",
    "hurt myself",
    "self-harm",
    "self harm",
  ];

  const hasHarm = harmWords.some((word) => text.includes(word));

  if (hasHarm) {
    return { escalated: true, confidence: 0.9 };
  }

  // Check for OD/overdose
  if (text.includes("overdose") || text.includes("od")) {
    return { escalated: true, confidence: 0.85 };
  }

  return { escalated: false, confidence: 0 };
}

/**
 * Check for violence risk
 * FIX #4: Avoid false positives like "kill it at the gym"
 */
function checkViolenceRisk(text) {
  // Context matters - look for serious intent
  const patterns = [
    /going to (?:kill|hurt|attack|shoot|stab)/,
    /i (?:will|want to) (?:kill|hurt|attack)/,
    /planning to (?:hurt|kill|attack)/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return { escalated: true, confidence: 0.9 };
    }
  }

  // Avoid false positive: "I killed it" in sports/achievement context
  if (
    text.includes("killed it") &&
    (text.includes("gym") ||
      text.includes("exam") ||
      text.includes("job") ||
      text.includes("presentation"))
  ) {
    return { escalated: false, confidence: 0 };
  }

  return { escalated: false, confidence: 0 };
}

/**
 * Check for domestic violence
 * FIX: Match verb conjugations (hits, hit, beating, beaten, etc.)
 */
function checkDomesticViolence(text) {
  const patterns = [
    /partner\s+(?:hit|hits|hitting|beat|beats|beating|beaten|abuse|abused|hurt|hurts|attack|attacks)/,
    /husband\s+(?:hit|hits|hitting|beat|beats|beating|beaten|abuse|abused)/,
    /wife\s+(?:hit|hits|hitting|beat|beats|beating|beaten|abuse|abused)/,
    /domestic (?:violence|abuse)/,
    /being (?:hit|beaten|abused|hurt|attacked)/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return { escalated: true, confidence: 0.9 };
    }
  }

  return { escalated: false, confidence: 0 };
}

/**
 * Check for child abuse
 */
function checkChildAbuse(text) {
  const patterns = [
    /child .*? (?:abuse|hurt|hit|beaten)/,
    /my (?:son|daughter|kid|child) .*? (?:being|is) (?:hurt|abused|hit)/,
    /child abuse/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return { escalated: true, confidence: 0.9 };
    }
  }

  return { escalated: false, confidence: 0 };
}

/**
 * Check for medical emergency
 */
function checkMedicalEmergency(text) {
  const emergencyWords = [
    "can't breathe",
    "chest pain",
    "heart attack",
    "stroke",
    "seizure",
    "bleeding",
    "choking",
  ];

  const hasEmergency = emergencyWords.some((word) =>
    text.includes(word)
  );

  if (hasEmergency) {
    return { escalated: true, confidence: 0.85 };
  }

  return { escalated: false, confidence: 0 };
}

export { detectEscalation };
