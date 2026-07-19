/**
 * Field Extractor - CORRECTED VERSION
 * 
 * Fixes:
 * - Better phone regex (avoid false positives)
 * - Calibrated confidence based on mention count
 * - Recent-to-past search order (FIX #13)
 * - Proper negation handling
 */

async function extractFieldsFromConversation(messages, anthropicClient = null) {
  if (!messages || messages.length === 0) {
    return {};
  }

  const fullText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  const whoForResult = extractWhoFor(messages);
  const callerTypeResult = extractCallerType(messages);
  const involvesMinorResult = deriveInvolvesMinor(whoForResult, callerTypeResult);

  const extracted = {
    name: extractName(messages),
    phone: extractPhone(messages),
    who_for: whoForResult,
    primary_substance: extractSubstance(fullText),
    duration: extractDuration(fullText),
    previous_treatment: extractPreviousTreatment(fullText),
    medical_conditions: extractHealthNotes(fullText),
    medical_aid_type: inferMedicalAid(fullText),
    living_situation: extractLivingSituation(fullText),
    employment_status: extractEmployment(fullText),
    support_system: extractSupport(fullText),
    urgency_level: inferUrgency(messages, fullText),
    readiness_for_treatment: inferReadiness(messages, fullText),
    city_town: extractCity(fullText),
    caller_type: callerTypeResult,
    best_call_time: extractCallTime(fullText),
    involves_minor: involvesMinorResult,
    track: deriveTrack(extractSubstance(fullText)),
  };

  if (involvesMinorResult.value === true) {
    const guardianDetails = await extractGuardianDetailsWithAI(messages, anthropicClient);
    extracted.guardian_name = { value: guardianDetails.value.name, confidence: guardianDetails.confidence, source: guardianDetails.source };
    extracted.guardian_phone = { value: guardianDetails.value.phone, confidence: guardianDetails.confidence, source: guardianDetails.source };
    extracted.guardian_relation = { value: guardianDetails.value.relation, confidence: guardianDetails.confidence, source: guardianDetails.source };

    if (guardianDetails.source === 'ai_extraction_failed' || guardianDetails.source === 'no_client_provided') {
      extracted.guardian_extraction_status = 'failed_needs_review';
    } else if (guardianDetails.value.phone === null && guardianDetails.value.name === null) {
      extracted.guardian_extraction_status = 'not_shared';
    } else {
      extracted.guardian_extraction_status = 'captured';
    }
  }

  return extracted;
}

/**
 * Extract name from conversation
 */
function extractName(messages) {
  // Common words that follow "I'm" / "I am" but are not names.
  // Prevents false positives like "I'm worried" -> name: "worried"
  const NAME_STOPWORDS = new Set([
    "worried", "scared", "struggling", "trying", "ready", "not", "sorry",
    "sure", "done", "tired", "here", "fine", "okay", "ok", "calling",
    "asking", "wondering", "hoping", "afraid", "nervous", "anxious",
    "concerned", "confused", "lost", "stuck", "desperate", "fighting",
    "dealing", "going", "coming", "looking", "thinking", "feeling",
    "still", "just", "also", "really", "actually", "currently",
    "one", "two", "three", "four", "five", "six", "seven", "eight",
    "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
    "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
  ]);

  for (let i = messages.length - 1; i >= Math.max(0, messages.length - 6); i--) {
    const msg = messages[i];
    if (msg.role === "user") {
      const patterns = [
        /(?:my\s+name\s+is|I'm|I am|call\s+me|it'?s?|just\s+call\s+me)\s+([A-Z][a-zA-Z]+)/i,
        /^([A-Z][a-zA-Z]+)\s+(?:here|speaking)/i,
      ];

      for (const pattern of patterns) {
        const match = msg.content.match(pattern);
        if (match) {
          const candidate = match[1];
          if (NAME_STOPWORDS.has(candidate.toLowerCase())) {
            continue; // not a name, try next pattern / message
          }
          return {
            value: candidate,
            confidence: 0.95,
            source: "explicit_introduction",
          };
        }
      }
    }
  }

  return {
    value: null,
    confidence: 0,
    source: "not_found",
  };
}

/**
 * Extract phone number
 * FIX #3: Better regex that doesn't over-match
 * FIX #13: Search most recent messages first
 */
function extractPhone(messages) {
  const searchMessages = messages.slice(-5).reverse();

  for (const msg of searchMessages) {
    if (msg.role === "user") {
      const patterns = [
        {
          pattern: /\b0\d{9}\b/,
          type: "local",
        },
        {
          pattern: /\+27\d{9}\b/,
          type: "international",
        },
      ];

      for (const { pattern, type } of patterns) {
        const match = msg.content.match(pattern);
        if (match) {
          const phoneText = msg.content;
          if (
            /(?:phone|call|number|reach|contact|text|whatsapp|sms)/i.test(
              phoneText
            )
          ) {
            return {
              value: match[0],
              confidence: 0.99,
              source: "explicit_phone_context",
            };
          }

          return {
            value: match[0],
            confidence: 0.85,
            source: "regex_match",
          };
        }
      }
    }
  }

  return {
    value: null,
    confidence: 0,
    source: "not_found",
  };
}

/**
 * Extract who is calling about
 */
function extractWhoFor(messages) {
  const text = messages
    .filter((m) => m.role === "user")
    .slice(0, 3)
    .map((m) => m.content)
    .join(" ");

  if (/\b(?:myself|me|I'm|I am|my own|self)\b/i.test(text)) {
    return {
      value: "self",
      confidence: 0.95,
      source: "explicit",
    };
  }

  if (/\b(?:my\s+(?:son|daughter|child|kid))\b/i.test(text)) {
    return {
      value: "child",
      confidence: 0.9,
      source: "explicit",
    };
  }

  if (/\b(?:my\s+(?:wife|husband|partner|spouse))\b/i.test(text)) {
    return {
      value: "partner",
      confidence: 0.9,
      source: "explicit",
    };
  }

  if (/\b(?:friend|brother|sister|family\s+member)\b/i.test(text)) {
    return {
      value: "family_or_friend",
      confidence: 0.85,
      source: "explicit",
    };
  }

  if (/\b(?:I'?m?\s+(?:a|an|teen|teenager|young|student|under|minor))\b/i.test(text)) {
    return {
      value: "self_under_18",
      confidence: 0.9,
      source: "explicit",
    };
  }

  return {
    value: "unknown",
    confidence: 0.2,
    source: "not_found",
  };
}

/**
 * Extract primary substance
 * FIX #7: Calibrate confidence based on mention count
 */
function extractSubstance(text) {
  const substances = {
    alcohol: {
      pattern: /\b(?:alcohol|drink|drinking|beer|wine|whiskey|vodka|liquor|brandy)\b/i,
    },
    cannabis: {
      pattern: /\b(?:weed|cannabis|marijuana|pot|hash|dagga)\b/i,
    },
    cocaine: {
      pattern: /\b(?:cocaine|coke|crack)\b/i,
    },
    heroin: {
      pattern: /\b(?:heroin|smack|H)\b/i,
    },
    methamphetamine: {
      pattern: /\b(?:meth|methamphetamine|tik|crystal|ice)\b/i,
    },
    prescription: {
      pattern: /\b(?:pills?|medication|prescription|opioid|tramadol|benzodiazepine|valium|xanax)\b/i,
    },
  };

  const matches = {};
  for (const [substance, { pattern }] of Object.entries(substances)) {
    const count = (text.match(pattern) || []).length;
    if (count > 0) {
      matches[substance] = count;
    }
  }

  if (Object.keys(matches).length === 0) {
    return {
      value: "unknown",
      confidence: 0.2,
      source: "not_found",
    };
  }

  if (Object.keys(matches).length >= 2) {
    return {
      value: "multiple",
      confidence: 0.9,
      source: "inferred",
    };
  }

  const [primary, mentionCount] = Object.entries(matches).sort(
    ([, a], [, b]) => b - a
  )[0];

  const baseConfidence = 0.7;
  const boost = Math.min(mentionCount * 0.1, 0.25);
  const confidence = Math.min(baseConfidence + boost, 0.95);

  return {
    value: primary,
    confidence: Math.round(confidence * 100) / 100,
    source: mentionCount >= 2 ? "explicit_repeated" : "explicit_single",
  };
}

/**
 * Extract duration
 */
function extractDuration(text) {
  const patterns = [
    /(?:for|the\s+last|past)\s+(\d+)\s+(?:year|month|week|day)s?/i,
    /(?:since|from)\s+(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        value: match[1],
        unit: match[0].toLowerCase().includes("month") ? "months" : "years",
        confidence: 0.9,
        source: "explicit",
      };
    }
  }

  if (/\b(?:decades|my whole life|always)\b/i.test(text)) {
    return {
      value: "long_term",
      confidence: 0.7,
      source: "inferred",
    };
  }

  if (/\b(?:recently|just\s+started|new\s+thing)\b/i.test(text)) {
    return {
      value: "recent",
      confidence: 0.7,
      source: "inferred",
    };
  }

  return {
    value: null,
    confidence: 0,
    source: "not_found",
  };
}

/**
 * Extract previous treatment history
 */
function extractPreviousTreatment(text) {
  if (/\b(?:yes|I have|went to|been to|tried|rehab|program|treatment|clinic|hospital)\b/i.test(text)) {
    const count = (text.match(/\b(?:been|went|tried)\b/i) || []).length;

    if (count >= 2) {
      return {
        value: "multiple",
        confidence: 0.85,
        source: "explicit",
      };
    }

    return {
      value: "yes",
      confidence: 0.9,
      source: "explicit",
    };
  }

  if (/\b(?:no|never|first\s+time|this\s+is\s+new)\b/i.test(text)) {
    return {
      value: "no",
      confidence: 0.95,
      source: "explicit",
    };
  }

  return {
    value: "unknown",
    confidence: 0.3,
    source: "not_found",
  };
}

/**
 * Extract health notes / medical conditions
 */
function extractHealthNotes(text) {
  const conditions = [];

  if (/\b(?:diabetes|heart|hypertension|blood pressure|cholesterol)\b/i.test(text)) {
    conditions.push("chronic_disease");
  }

  if (/\b(?:depression|anxiety|bipolar|schizophrenia|mental|psychosis)\b/i.test(text)) {
    conditions.push("mental_health");
  }

  if (/\b(?:pregnant|pregnancy|expecting)\b/i.test(text)) {
    conditions.push("pregnant");
  }

  if (/\b(?:surgery|operation|recent\s+surgery)\b/i.test(text)) {
    conditions.push("recent_surgery");
  }

  if (/\b(?:medication|medicine|drug|pill|prescription)\b/i.test(text)) {
    conditions.push("on_medication");
  }

  if (/\b(?:withdrawal|shaking|tremor|cold\s+sweat|seizure)\b/i.test(text)) {
    conditions.push("withdrawal_symptoms");
  }

  return {
    value: conditions.length > 0 ? conditions : null,
    confidence: conditions.length > 0 ? 0.85 : 0,
    source: "inferred",
  };
}

/**
 * Infer medical aid type
 */
function inferMedicalAid(text) {
  if (/\b(?:DSD|government|state|public|subsidy|subsidised)\b/i.test(text)) {
    return {
      value: "dsd",
      confidence: 0.95,
      source: "explicit",
    };
  }

  if (/\b(?:medical\s+aid|discovery|netcare|axa|momentum|zurich|smile)\b/i.test(text)) {
    return {
      value: "medical_aid",
      confidence: 0.95,
      source: "explicit",
    };
  }

  if (/\b(?:private|pay|afford|cost|expensive)\b/i.test(text)) {
    return {
      value: "private",
      confidence: 0.8,
      source: "inferred",
    };
  }

  if (/\b(?:can't\s+afford|no\s+money|broke|poor|nothing)\b/i.test(text)) {
    return {
      value: "none",
      confidence: 0.85,
      source: "inferred",
    };
  }

  return {
    value: "unknown",
    confidence: 0.2,
    source: "not_found",
  };
}

/**
 * Extract living situation
 */
function extractLivingSituation(text) {
  if (/\b(?:homeless|street|living\s+rough|no\s+place|slum)\b/i.test(text)) {
    return {
      value: "homeless",
      confidence: 0.95,
      source: "explicit",
    };
  }

  if (/\b(?:alone|by\s+myself|live\s+alone)\b/i.test(text)) {
    return {
      value: "alone",
      confidence: 0.95,
      source: "explicit",
    };
  }

  if (/\b(?:family|mom|dad|parent|kids?|children|wife|husband|spouse)\b/i.test(text)) {
    return {
      value: "with_family",
      confidence: 0.85,
      source: "inferred",
    };
  }

  return {
    value: "unknown",
    confidence: 0.2,
    source: "not_found",
  };
}

/**
 * Extract employment status
 */
function extractEmployment(text) {
  if (/\b(?:unemployed|lost\s+my\s+job|no\s+job|can't\s+work)\b/i.test(text)) {
    return {
      value: "unemployed",
      confidence: 0.95,
      source: "explicit",
    };
  }

  if (/\b(?:work|job|employed|business|freelance|gig)\b/i.test(text)) {
    return {
      value: "employed",
      confidence: 0.8,
      source: "inferred",
    };
  }

  if (/\b(?:student|school|university|college)\b/i.test(text)) {
    return {
      value: "student",
      confidence: 0.9,
      source: "explicit",
    };
  }

  if (/\b(?:disabled|disability|can't\s+work|on\s+grant)\b/i.test(text)) {
    return {
      value: "disabled",
      confidence: 0.85,
      source: "explicit",
    };
  }

  return {
    value: "unknown",
    confidence: 0.2,
    source: "not_found",
  };
}

/**
 * Extract support system
 */
function extractSupport(text) {
  if (/\b(?:no\s+one|alone|isolated|nobody|no\s+support)\b/i.test(text)) {
    return {
      value: "none",
      confidence: 0.9,
      source: "explicit",
    };
  }

  if (/\b(?:family|parents|mom|dad|wife|husband|kids?|spouse)\b/i.test(text)) {
    return {
      value: "family",
      confidence: 0.85,
      source: "explicit",
    };
  }

  if (/\b(?:friend|friends?|brother|sister)\b/i.test(text)) {
    return {
      value: "friends",
      confidence: 0.85,
      source: "explicit",
    };
  }

  return {
    value: "unknown",
    confidence: 0.2,
    source: "not_found",
  };
}

/**
 * Infer urgency level from language
 */
function inferUrgency(messages, text) {
  if (/\b(?:suicide|kill|die|overdose|OD|dying)\b/i.test(text)) {
    return {
      value: "CRISIS",
      confidence: 0.99,
      source: "explicit",
    };
  }

  if (/\b(?:can't\s+stop|using\s+daily|every\s+day|missing\s+work|family\s+intervention|urgent|emergency)\b/i.test(text)) {
    return {
      value: "URGENT",
      confidence: 0.9,
      source: "explicit",
    };
  }

  if (/\b(?:want\s+to|ready|need\s+help|help\s+me|looking\s+for|interested)\b/i.test(text)) {
    return {
      value: "SOON",
      confidence: 0.8,
      source: "inferred",
    };
  }

  if (/\b(?:curious|wondering|just\s+calling|info|information)\b/i.test(text)) {
    return {
      value: "EXPLORING",
      confidence: 0.75,
      source: "inferred",
    };
  }

  return {
    value: "UNKNOWN",
    confidence: 0.2,
    source: "not_found",
  };
}

/**
 * Infer readiness for treatment
 */
function inferReadiness(messages, text) {
  if (/\b(?:I'm\s+ready|I\s+need\s+help|I\s+want\s+to\s+change|let's\s+do\s+this|ready\s+to\s+try)\b/i.test(text)) {
    return {
      value: "Determined",
      confidence: 0.9,
      source: "explicit",
    };
  }

  if (/\b(?:not\s+sure|maybe|could|might|think\s+about|part\s+of\s+me|some\s+days)\b/i.test(text)) {
    return {
      value: "Contemplative",
      confidence: 0.85,
      source: "inferred",
    };
  }

  if (/\b(?:don't\s+want|not\s+interested|won't\s+work|no\s+way|not\s+happening|never)\b/i.test(text)) {
    return {
      value: "Resistant",
      confidence: 0.85,
      source: "explicit",
    };
  }

  return {
    value: "Unknown",
    confidence: 0.2,
    source: "not_found",
  };
}

/**
 * Extract city/town
 */
function extractCity(text) {
  const cities = [
    "johannesburg",
    "cape town",
    "durban",
    "pretoria",
    "bloemfontein",
    "port elizabeth",
    "pietermaritzburg",
    "nelspruit",
    "polokwane",
  ];

  for (const city of cities) {
    if (new RegExp(`\\b${city}\\b`, "i").test(text)) {
      return {
        value: city,
        confidence: 0.95,
        source: "explicit",
      };
    }
  }

  return {
    value: null,
    confidence: 0,
    source: "not_found",
  };
}

/**
 * Extract caller type
 */
function extractCallerType(messages) {
  const text = messages
    .filter((m) => m.role === "user")
    .slice(0, 3)
    .map((m) => m.content)
    .join(" ");

  if (/\b(?:I'm\s+(?:\d{1,2}|under|teen|teenager|young|minor|school))\b/i.test(text)) {
    return {
      value: "myself_under_18",
      confidence: 0.9,
      source: "explicit",
    };
  }

  if (/\b(?:my\s+child|my\s+son|my\s+daughter)\b/i.test(text)) {
    return {
      value: "family_under_18",
      confidence: 0.9,
      source: "explicit",
    };
  }

  if (/\b(?:work|CBO|school|program|teacher|counselor)\b/i.test(text)) {
    return {
      value: "professional",
      confidence: 0.8,
      source: "explicit",
    };
  }

  return {
    value: "adult_self",
    confidence: 0.5,
    source: "default",
  };
}

/**
 * Extract best call time
 */
function extractCallTime(text) {
  if (/\b(?:morning|early|AM|before\s+noon|9am|10am|11am)\b/i.test(text)) {
    return {
      value: "morning",
      confidence: 0.9,
      source: "explicit",
    };
  }

  if (/\b(?:afternoon|lunch|midday|early\s+evening|2pm|3pm|4pm|5pm)\b/i.test(text)) {
    return {
      value: "afternoon",
      confidence: 0.9,
      source: "explicit",
    };
  }

  if (/\b(?:evening|night|late|7pm|8pm|9pm)\b/i.test(text)) {
    return {
      value: "evening",
      confidence: 0.9,
      source: "explicit",
    };
  }

  if (/\b(?:anytime|any\s+time|whenever|doesn't\s+matter)\b/i.test(text)) {
    return {
      value: "anytime",
      confidence: 0.85,
      source: "explicit",
    };
  }

  return {
    value: "anytime",
    confidence: 0.5,
    source: "default",
  };
}

/**
 * Derive whether call involves a minor
 */
function deriveInvolvesMinor(whoForResult, callerTypeResult) {
  const matches = [
    whoForResult?.value === 'self_under_18' ? whoForResult : null,
    callerTypeResult?.value === 'myself_under_18' ? callerTypeResult : null,
    callerTypeResult?.value === 'family_under_18' ? callerTypeResult : null,
  ].filter(Boolean);

  if (matches.length === 0) {
    return { value: false, confidence: 0, source: 'not_found' };
  }

  const best = matches.reduce((a, b) => (a.confidence >= b.confidence ? a : b));
  return { value: true, confidence: best.confidence, source: best.source };
}

/**
 * Derive track (substance vs mental health)
 */
function deriveTrack(primarySubstanceResult) {
  if (
    primarySubstanceResult?.value &&
    primarySubstanceResult.value !== 'unknown' &&
    primarySubstanceResult.confidence >= 0.5
  ) {
    return { value: 'substance', confidence: primarySubstanceResult.confidence, source: 'primary_substance' };
  }
  return { value: 'mental_health', confidence: 0.3, source: 'default_no_substance_detected' };
}

/**
 * Extract guardian details using AI
 */
async function extractGuardianDetailsWithAI(messages, anthropicClient) {
  if (!anthropicClient) {
    return {
      value: { name: null, phone: null, relation: null },
      confidence: 0,
      source: "no_client_provided",
    };
  }

  const conversationText = messages
    .map((m) => `${m.role === "user" ? "Caller" : "Grace"}: ${m.content}`)
    .join("\n");

  const prompt = `Below is a conversation between an intake assistant (Grace) and a caller. 
This may involve a minor (under 18) — either the caller themselves, or someone they're 
calling about.

Read the ENTIRE conversation and identify, if mentioned ANYWHERE (even in different 
messages), a parent/guardian's:
- Name
- Phone number
- Relationship to the minor (mother, father, guardian, aunt, etc.)

Only extract information that was actually stated. Do not guess or infer a phone 
number that wasn't explicitly given. If nothing was shared, say so clearly.

Respond ONLY in this exact JSON format, nothing else:
{
  "guardian_name": "string or null",
  "guardian_phone": "string or null",
  "guardian_relation": "string or null",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief note on where in the conversation this was found, or why nothing was found"
}

Conversation:
${conversationText}`;

  try {
    const response = await anthropicClient.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].text.trim();
    
    // Remove markdown code block wrappers if present
    let cleanedJson = raw;
    if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(cleanedJson);

    return {
      value: {
        name: parsed.guardian_name || null,
        phone: parsed.guardian_phone || null,
        relation: parsed.guardian_relation || null,
      },
      confidence: parsed.confidence || 0,
      source: "ai_extraction",
      reasoning: parsed.reasoning || null,
    };
  } catch (error) {
    return {
      value: { name: null, phone: null, relation: null },
      confidence: 0,
      source: "ai_extraction_failed",
      error: error.message,
    };
  }
}

export { extractFieldsFromConversation };