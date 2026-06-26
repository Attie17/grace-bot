/**
 * Scripted stage engine for Grace's intake flow.
 *
 * Most stages are fixed copy keyed by stage id. The free-text stages
 * (stage4b health notes, wellness_intro, and the optional `notes` catch-all)
 * route through /api/chat for an empathetic Claude acknowledgement.
 */

import { STAGE_1_OPENING_MESSAGES } from './prompts.js';

const URGENT_VALUE = "As soon as possible — it's urgent";

const stages = {
    stage1b: {
        prompt: () => ({
            messages: ['Hi there! Let\'s get you connected with the right support. First, who are you reaching out for today?'],
            inputType: 'none',
            stageId: 'stage1b'
        }),
        accept: (value, leadData) => {
            return { next: 'stage_who_for' };
        }
    },

    stage3: {
        prompt: (leadData) => {
            const subject = leadData.for_whom === 'Myself' ? 'you are' : 'they are';
            return {
                messages: [
                    `What would you say ${subject} struggling with most right now?`
                ],
                inputType: 'buttons',
                options: [
                    { label: '🍺 Alcohol',                   value: 'Alcohol' },
                    { label: '💊 Drugs or substances',       value: 'Drugs or substances' },
                    { label: '💉 Prescription medication',   value: 'Prescription medication' },
                    { label: '📱 Digital, screen or gaming', value: 'Digital, screen or gaming' },
                    { label: '🔀 More than one of these',    value: 'More than one of these' },
                    { label: '❓ Not sure yet',              value: 'Not sure yet' }
                ],
                stageId: 'stage3'
            };
        },
        accept: (value, leadData) => {
            leadData.struggle = value;
            return { next: 'stage4a' };
        }
    },

    stage4a: {
        prompt: (leadData) => {
            const subject = leadData.for_whom === 'Myself' ? 'you' : 'they';
            return {
                messages: [`Have ${subject} been through any form of treatment or rehab before?`],
                inputType: 'buttons',
                options: [
                    { label: '✅ No — this is the first time', value: 'No — first time' },
                    { label: '🔁 Yes, once before',            value: 'Yes, once before' },
                    { label: '🔄 Yes, more than once',         value: 'Yes, more than once' }
                ],
                stageId: 'stage4a'
            };
        },
        accept: (value, leadData) => {
            leadData.previous_treatment = value;
            return { next: 'stage4b' };
        }
    },

    // Stage 4b is the only stage that flows through /api/chat — the question
    // is scripted, but the user's free-text reply gets an empathetic AI ack.
    stage4b: {
        prompt: () => ({
            messages: [
                "Understood. Are there any other health concerns I should note — physical or mental health? (Type 'none' if not.)"
            ],
            inputType: 'text',
            useAI: true,
            stageId: 'stage4b'
        }),
        accept: (value, leadData) => {
            leadData.health_notes = value;
            return { next: 'stage5' };
        }
    },

    stage5: {
        prompt: () => ({
            messages: [
                "Here's something that often surprises people — Stabilis is fully covered by most medical aids, including Discovery, Momentum, Bonitas, Bankmed, and GEMS.",
                'Do you have medical aid?'
            ],
            inputType: 'buttons',
            options: [
                { label: '✅ Yes, I have medical aid',   value: 'Yes' },
                { label: '💳 No — paying privately',     value: 'No' },
                { label: '🤔 Not sure / need to check',  value: 'Unsure' }
            ],
            stageId: 'stage5'
        }),
        accept: (value, leadData) => {
            leadData.medical_aid = value;
            if (value === 'Yes') {
                return {
                    ack: ["Wonderful — that's great news."],
                    next: 'stage5b'
                };
            }
            if (value === 'No') {
                return {
                    ack: [
                        'No problem at all. Our private rate is R1,500 per day, and we offer a debit order facility to spread the cost.',
                        'Payment arrangements may also be possible — our team will go through all the options with you when they call.'
                    ],
                    next: 'stage_city'
                };
            }
            return {
                ack: ["That's completely fine — our team will help you check when they call. It's often better news than people expect."],
                next: 'stage_city'
            };
        }
    },

    stage5b: {
        prompt: () => ({
            messages: ['Which medical aid are you on?'],
            inputType: 'buttons',
            options: [
                { label: 'Discovery Health',   value: 'Discovery Health' },
                { label: 'Medihelp',           value: 'Medihelp' },
                { label: 'Bonitas',            value: 'Bonitas' },
                { label: 'Momentum Health',    value: 'Momentum Health' },
                { label: 'Bestmed',            value: 'Bestmed' },
                { label: 'Fedhealth',          value: 'Fedhealth' },
                { label: 'Profmed',            value: 'Profmed' },
                { label: 'KeyHealth',          value: 'KeyHealth' },
                { label: 'Other',              value: 'Other' }
            ],
            stageId: 'stage5b'
        }),
        accept: (value, leadData) => {
            leadData.medical_aid_name = value.trim();
            return {
                ack: ['Thank you — noted.'],
                next: 'stage5c'
            };
        }
    },

    stage5c: {
        prompt: () => ({
            messages: ['Do you have your medical member number handy? (This helps speed up our check-in process)'],
            inputType: 'text',
            stageId: 'stage5c'
        }),
        accept: (value, leadData) => {
            leadData.medical_member_number = value.trim();
            return { next: 'stage_city' };
        }
    },

    stage_city: {
        prompt: () => ({
            messages: ['Which city or town are you in?'],
            inputType: 'text',
            stageId: 'stage_city'
        }),
        accept: (value, leadData) => {
            leadData.city = value.trim();
            return { next: 'stage6' };
        }
    },

    stage_who_for: {
        prompt: () => ({
            messages: ['Who are you reaching out for?'],
            inputType: 'buttons',
            options: [
                { label: '🙋 For myself',           value: 'myself' },
                { label: '👥 For someone else',     value: 'someone_else' },
                { label: '🏫 I\'m a professional',   value: 'professional' }
            ],
            stageId: 'stage_who_for'
        }),
        accept: (value, leadData) => {
            leadData.who_for = value;
            if (value === 'myself') {
                leadData.for_whom = 'Myself';
                return { next: 'stage_track' };
            }
            if (value === 'someone_else') {
                return { next: 'stage_relationship' };
            }
            // professional
            leadData.for_whom = 'Professional referral';
            return { next: 'stage_professional_ack' };
        }
    },

    stage_relationship: {
        prompt: () => ({
            messages: ['What is your relationship to them?'],
            inputType: 'buttons',
            options: [
                { label: '👧 My child or teenager',     value: 'child' },
                { label: '💑 My partner or spouse',     value: 'partner' },
                { label: '👨‍👩‍👧 A family member',       value: 'family' },
                { label: '👫 A friend',                 value: 'friend' },
                { label: '🤝 Other',                    value: 'other' }
            ],
            stageId: 'stage_relationship'
        }),
        accept: (value, leadData) => {
            leadData.caller_relation = value;
            // Map to for_whom for stage3/stage4a compatibility
            const forWhomMap = {
                'child': 'My child',
                'partner': 'My partner',
                'family': 'Family member',
                'friend': 'Friend',
                'other': 'Other'
            };
            leadData.for_whom = forWhomMap[value] || 'Other';
            return { next: 'stage_referred_name' };
        }
    },

    stage_referred_name: {
        prompt: () => ({
            messages: ['What is their first name?'],
            inputType: 'text',
            stageId: 'stage_referred_name'
        }),
        accept: (value, leadData) => {
            const name = value.trim();
            leadData.referred_name = name;
            // Save to notes for therapist
            const relationLabel = {
                'child': 'child/teenager',
                'partner': 'partner',
                'family': 'family member',
                'friend': 'friend',
                'other': 'person'
            }[leadData.caller_relation] || 'person';
            const note = `Calling about their ${relationLabel}, ${name}.`;
            leadData.notes_for_therapist = leadData.notes_for_therapist 
                ? `${note} ${leadData.notes_for_therapist}`
                : note;
            
            // Route to stage_is_minor if child, otherwise to confidentiality
            if (leadData.caller_relation === 'child') {
                return { next: 'stage_is_minor' };
            }
            return { next: 'stage_confidentiality_assurance' };
        }
    },

    stage_is_minor: {
        prompt: () => ({
            messages: ['Is your child or teenager under 18?'],
            inputType: 'buttons',
            options: [
                { label: 'Yes, under 18',  value: 'yes' },
                { label: 'No, 18 or over', value: 'no'  }
            ],
            stageId: 'stage_is_minor'
        }),
        accept: (value, leadData) => {
            if (value === 'yes') {
                leadData.involves_minor = true;
                leadData.caller_age_band = 'minor_other';
                return { next: 'stage_minor_confidentiality' };
            }
            // 18 or over
            leadData.involves_minor = false;
            leadData.caller_age_band = 'adult';
            return { next: 'stage_confidentiality_assurance' };
        }
    },

    stage_confidentiality_assurance: {
        prompt: (leadData) => {
            const name = leadData.referred_name || 'them';
            return {
                messages: [
                    `Just so you know - everything you share here is completely confidential and will not be shared with any third party. We will only contact ${name} if you specifically ask us to. Our team will call you back first, and you can decide together how to handle next steps.`
                ],
                inputType: 'none',
                stageId: 'stage_confidentiality_assurance'
            };
        },
        accept: (value, leadData) => {
            return { next: 'stage_track' };
        }
    },

    stage_minor_confidentiality: {
        prompt: (leadData) => {
            return {
                messages: [
                    'Everything you share here is completely confidential. Our team will contact you first - we will not reach out to your child directly without discussing it with you. You\'re in control of next steps.'
                ],
                inputType: 'none',
                stageId: 'stage_minor_confidentiality'
            };
        },
        accept: (value, leadData) => {
            return { next: 'stage_track' };
        }
    },

    stage_professional_ack: {
        prompt: () => ({
            messages: [
                'Thank you for your professional referral.',
                'We appreciate your trust in Stabilis. Our team will reach out to discuss the best way to support this individual.'
            ],
            inputType: 'buttons',
            options: [
                { label: 'Continue', value: 'continue' }
            ],
            stageId: 'stage_professional_ack'
        }),
        accept: (value, leadData) => {
            return { next: 'stage_track' };
        }
    },

    stage_track: {
        prompt: () => ({
            messages: ['What brings you here?'],
            inputType: 'buttons',
            options: [
                { label: '🍷 Substance use',           value: 'substance' },
                { label: '🧠 Emotional / mental health', value: 'mental_health' },
                { label: '📱 Digital / screen / gaming', value: 'digital' },
                { label: '🤔 Not sure',                value: 'not_sure' }
            ],
            stageId: 'stage_track'
        }),
        accept: (value, leadData) => {
            leadData.track = value;
            // Route to personalized opening acknowledgement
            return { next: 'stage_opening_ack' };
        }
    },

    stage_opening_ack: {
        prompt: () => ({
            messages: [],
            inputType: 'none',
            stageId: 'stage_opening_ack'
        }),
        accept: (value, leadData) => {
            // Route based on track selection
            if (leadData.track === 'mental_health') {
                return { next: 'stage_mh_opening' };
            }
            // substance, digital, not_sure all go to substance flow (stage3)
            return { next: 'stage3' };
        }
    },

    stage_mh_opening: {
        prompt: () => ({
            messages: [
                "Tell me a little about what you're going through — in your own words, no pressure."
            ],
            inputType: 'text',
            useAI: true,
            stageId: 'stage_mh_opening'
        }),
        accept: (value, leadData) => {
            const description = (value || '').trim();
            leadData.mh_description = description;
            leadData.notes_for_therapist = (leadData.notes_for_therapist || '') + '\n\nMental health description: ' + description;
            return { next: 'stage_mh_safety' };
        }
    },

    stage_mh_safety: {
        prompt: () => ({
            messages: ['How would you describe where things are right now?'],
            inputType: 'buttons',
            options: [
                { label: '🟢 I\'m struggling but I\'m okay',     value: 'stable' },
                { label: '🟠 This feels urgent',                value: 'urgent' },
                { label: '🔴 I\'m in crisis right now',          value: 'crisis' }
            ],
            stageId: 'stage_mh_safety'
        }),
        accept: (value, leadData) => {
            leadData.urgency_level = value;
            
            if (value === 'crisis') {
                return {
                    ack: [
                        "Please know you are not alone. If you are in immediate danger, please call 10177 (emergency) or Netcare 911 on 082 911. Our team will also contact you as a priority — please continue so we have your details."
                    ],
                    next: 'stage_mh_prior_treatment'
                };
            }
            
            return { next: 'stage_mh_prior_treatment' };
        }
    },

    stage_mh_prior_treatment: {
        prompt: () => ({
            messages: ['Have you seen a therapist, counsellor, or psychiatrist before?'],
            inputType: 'buttons',
            options: [
                { label: 'Yes',                          value: 'yes' },
                { label: 'No',                           value: 'no'  },
                { label: 'I\'m currently seeing someone', value: 'current' }
            ],
            stageId: 'stage_mh_prior_treatment'
        }),
        accept: (value, leadData) => {
            leadData.previous_treatment = value;
            return { next: 'stage4b' };
        }
    },

    stage_guardian_name: {
        prompt: () => ({
            messages: [
                "We'd love to make sure you have the right support around you. Is there a parent or guardian we can include in this process?",
                "If yes, what is their name?"
            ],
            inputType: 'text',
            placeholder: "Guardian's name, or type 'no' to skip",
            stageId: 'stage_guardian_name'
        }),
        accept: (value, leadData) => {
            const skip = value.trim().toLowerCase() === 'no' || value.trim() === '';
            leadData.guardian_name = skip ? null : value.trim();
            return { next: skip ? 'stage3' : 'stage_guardian_phone' };
        }
    },

    stage_guardian_phone: {
        prompt: (leadData) => ({
            messages: [`What is the best number to reach ${leadData.guardian_name}?`],
            inputType: 'text',
            placeholder: "Guardian's phone number",
            stageId: 'stage_guardian_phone'
        }),
        accept: (value, leadData) => {
            leadData.guardian_phone = value.trim();
            return { next: 'stage3' };
        }
    },

    stage_guardian_relation: {
        prompt: () => ({
            messages: ['What is the guardian\'s relationship to the young person?'],
            inputType: 'buttons',
            options: [
                { label: '👨‍👩‍👧 Parent',       value: 'Parent' },
                { label: '👴 Grandparent',    value: 'Grandparent' },
                { label: '👨‍👩‍👦 Step-parent', value: 'Step-parent' },
                { label: '🧑 Other relative', value: 'Other relative' },
                { label: '🏫 School / CBO',   value: 'School / CBO' }
            ],
            stageId: 'stage_guardian_relation'
        }),
        accept: (value, leadData) => {
            leadData.guardian_relation = value;
            return {
                ack: ['Thank you — noted.'],
                next: 'stage3'
            };
        }
    },

    stage6: {
        prompt: () => ({
            messages: ['When are you hoping to get started?'],
            inputType: 'buttons',
            options: [
                { label: "🚨 As soon as possible — it's urgent", value: URGENT_VALUE },
                { label: '📅 Within the next week',              value: 'Within the next week' },
                { label: '🗓️ Within the next month',             value: 'Within the next month' },
                { label: '🔍 Still exploring options',           value: 'Still exploring options' }
            ],
            stageId: 'stage6'
        }),
        accept: (value, leadData) => {
            leadData.readiness = value;
            if (value === URGENT_VALUE) leadData.urgent = true;
            return { next: 'stage_urgency_detail' };
        }
    },

    stage_urgency_detail: {
        prompt: () => ({
            messages: ['How would you describe where things are right now?'],
            inputType: 'buttons',
            options: [
                { label: '🔴 Getting worse — I need help urgently', value: 'urgent'   },
                { label: '🟠 Struggling but managing',              value: 'managing' },
                { label: '🟢 Thinking about making a change',       value: 'planning' }
            ],
            stageId: 'stage_urgency_detail'
        }),
        accept: (value, leadData) => {
            leadData.urgency_level = value;
            if (value === 'urgent') {
                leadData.urgent = true;
            }
            return { next: 'notes' };
        }
    },

    // Wellness path entry — warm, non-clinical opener and the only clinical
    // signal we collect on this track: a free-text "what's going on" message.
    // Routes through /api/chat so Claude can acknowledge empathetically.
    wellness_intro: {
        prompt: () => ({
            messages: [
                "I'm really glad you came here. Whatever you're carrying right now, you don't have to carry it alone.",
                "Please tell us a little about what you're going through — in your own words, no pressure."
            ],
            inputType: 'text',
            useAI: true,
            stageId: 'wellness_intro'
        }),
        accept: (value, leadData) => {
            leadData.wellness_brief = (value || '').trim();
            return { next: 'notes' };
        }
    },

    // Optional catch-all on both tracks. User can type free-text (routed
    // through /api/chat for an AI ack) or hit Skip (routed through /api/stage
    // with value=null — no ack, straight to contact details).
    notes: {
        prompt: () => ({
            messages: ["Before we get your contact details — is there anything else you'd like the team to know?"],
            inputType: 'text',
            useAI: true,
            skippable: true,
            stageId: 'notes'
        }),
        accept: (value, leadData) => {
            const trimmed = typeof value === 'string' ? value.trim() : '';
            leadData.additional_notes = trimmed ? trimmed : null;
            return { next: 'stage7a' };
        }
    },

    stage7a: {
        prompt: () => ({
            messages: ['Almost there. What name can one of our staff members ask for when they call?'],
            inputType: 'text',
            stageId: 'stage7a'
        }),
        accept: (value, leadData) => {
            leadData.contact_name = value.trim();
            return {
                ack: [`Thank you, ${leadData.contact_name}.`],
                next: 'stage7b'
            };
        }
    },

    stage7b: {
        prompt: () => ({
            messages: ['And the best number to reach you on?'],
            inputType: 'text',
            stageId: 'stage7b'
        }),
        accept: (value, leadData) => {
            leadData.contact_phone = value.trim();
            return {
                ack: ['Got it — thank you.'],
                next: 'stage7c'
            };
        }
    },

    stage7c: {
        prompt: () => ({
            messages: ['And your email address (so we can send you confirmation and resources)?'],
            inputType: 'text',
            stageId: 'stage7c'
        }),
        accept: (value, leadData) => {
            leadData.contact_email = value.trim();
            return {
                ack: ['Perfect — we have all your details now.'],
                next: 'stage8'
            };
        }
    },

    stage8: {
        prompt: () => ({
            messages: ['What time works best for a call?'],
            inputType: 'buttons',
            options: [
                { label: '🌅 Morning (8am–12pm)',   value: 'morning' },
                { label: '☀️ Afternoon (12pm–5pm)', value: 'afternoon' },
                { label: '🌇 Evening (5pm–7pm)',    value: 'evening' },
                { label: '🕐 Any time works',       value: 'any' }
            ],
            stageId: 'stage8'
        }),
        accept: (value, leadData) => {
            leadData.call_time = value;
            return { next: 'closing' };
        }
    },

    closing: {
        prompt: (leadData) => {
            const name = leadData.contact_name || 'there';
            const messages = leadData.urgent
                ? [
                      `We will contact you as soon as possible, ${name}. If we're able to accommodate you, we'll confirm all the details when we call. You've made the right decision reaching out today.`,
                      'Please keep your phone nearby.',
                      "In the meantime, if the situation becomes an emergency at any point, please don't hesitate to call Netcare 911 on 082 911 or the public ambulance on 10177. They are there for exactly these moments. 💚"
                  ]
                : [
                      `Thank you so much, ${name}. You've just taken one of the bravest steps there is.`,
                      'One of our staff members will be in touch with you soon. Please keep your phone nearby.',
                      'And remember — if anything feels urgent before then, Netcare 911 on 082 911 is always available. We care about you. 💚'
                  ];
            return {
                messages,
                inputType: 'none',
                stageId: 'closing',
                ended: true
            };
        }
    }
};

export const FIRST_STAGE_ID = 'stage1b';

export function buildOpeningPayload() {
    return {
        messages: STAGE_1_OPENING_MESSAGES,
        nextStage: FIRST_STAGE_ID
    };
}

export function getStagePayload(stageId, leadData = {}) {
    const stage = stages[stageId];
    if (!stage) throw new Error(`Unknown stage: ${stageId}`);
    return stage.prompt(leadData);
}

export function advance(stageId, value, leadData = {}) {
    const stage = stages[stageId];
    if (!stage || !stage.accept) throw new Error(`Cannot advance stage: ${stageId}`);

    const { ack = [], next } = stage.accept(value, leadData);
    const payload = stages[next].prompt(leadData);

    return {
        ack,
        next: payload,
        leadData,
        ended: !!payload.ended
    };
}

export function buildClinicalBrief(leadData) {
    const track = leadData.track || 'substance';
    const urgency = leadData.urgent
        ? 'immediate'
        : track === 'mental_health' ? 'researching' : 'soon';

    const callTimeMap = {
        morning: 'Morning (8am–12pm)',
        afternoon: 'Afternoon (12pm–5pm)',
        evening: 'Evening (5pm–7pm)',
        any: 'Any time'
    };

    return {
        conversation_complete: true,
        track,
        urgency,
        who_for: leadData.who_for || null,
        for_whom: leadData.for_whom || null,
        caller_relation: leadData.caller_relation || null,
        referred_name: leadData.referred_name || null,
        substance_primary: leadData.struggle || null,
        previous_treatment: leadData.previous_treatment || null,
        health_notes: leadData.health_notes || null,
        medical_aid: leadData.medical_aid || null,
        medical_aid_name: leadData.medical_aid_name || null,
        medical_member_number: leadData.medical_member_number || null,
        readiness: leadData.readiness || null,
        contact_name: leadData.contact_name || null,
        contact_phone: leadData.contact_phone || null,
        contact_email: leadData.contact_email || null,
        call_time: leadData.call_time || null,
        preferred_callback_time: callTimeMap[leadData.call_time] || leadData.call_time || null,
        wellness_brief: leadData.wellness_brief || null,
        mh_description: leadData.mh_description || null,
        urgency_level: leadData.urgency_level || null,
        additional_notes: leadData.additional_notes || null,
        notes_for_therapist: leadData.notes_for_therapist || null,
        city: leadData.city || null,
        caller_type: leadData.caller_type || null,
        involves_minor: leadData.involves_minor || false,
        caller_age_band: leadData.caller_age_band || 'adult',
        guardian_name: leadData.guardian_name || null,
        guardian_phone: leadData.guardian_phone || null,
        guardian_relation: leadData.guardian_relation || null
    };
}
