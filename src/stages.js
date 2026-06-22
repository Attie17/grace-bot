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
            messages: ['To make sure we get you to the right person — what brings you here today?'],
            inputType: 'buttons',
            options: [
                { label: '💊 Substance Use',                 value: 'sud' },
                { label: '💚 Emotional / Mental Health',     value: 'wellness' }
            ],
            stageId: 'stage1b'
        }),
        accept: (value, leadData) => {
            leadData.track = value === 'wellness' ? 'wellness' : 'sud';
            if (leadData.track === 'wellness') return { next: 'wellness_intro' };
            return { next: 'stage2' };
        }
    },

    stage2: {
        prompt: () => ({
            messages: ['First — is this for yourself, or for someone you care about?'],
            inputType: 'buttons',
            options: [
                { label: '🙋 For myself',           value: 'Myself' },
                { label: '💑 My partner / spouse',  value: 'Partner/spouse' },
                { label: '👦 My child',             value: 'My child' },
                { label: '👨‍👩‍👧 A family member',   value: 'Family member' },
                { label: '🤝 A friend',             value: 'A friend' }
            ],
            stageId: 'stage2'
        }),
        accept: (value, leadData) => {
            leadData.for_whom = value;
            return { next: 'stage3' };
        }
    },

    stage3: {
        prompt: (leadData) => {
            const subject = leadData.for_whom === 'Myself' ? 'you are' : 'they are';
            return {
                messages: [
                    'Thank you for sharing that.',
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
                next: 'stage_city'
            };
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
            return { next: 'stage_caller_type' };
        }
    },

    stage_caller_type: {
        prompt: () => ({
            messages: ['One more quick question — are you calling about yourself, or about someone younger than 18?'],
            inputType: 'buttons',
            options: [
                { label: '🙋 For myself',                            value: 'myself' },
                { label: '👦 For someone under 18',                  value: 'under_18' },
                { label: '🧒 I am under 18',                         value: 'i_am_under_18' },
                { label: '👨‍👩‍👧 For a family member',               value: 'family_member' },
                { label: '🏫 I work with young people (CBO/school)', value: 'cbo_school' }
            ],
            stageId: 'stage_caller_type'
        }),
        accept: (value, leadData) => {
            leadData.caller_type = value;
            return { next: 'stage6' };
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
                ack: ['Got it — and the best time to call?'],
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
    const track = leadData.track || 'sud';
    const urgency = leadData.urgent
        ? 'immediate'
        : track === 'wellness' ? 'researching' : 'soon';

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
        for_whom: leadData.for_whom || null,
        substance_primary: leadData.struggle || null,
        previous_treatment: leadData.previous_treatment || null,
        health_notes: leadData.health_notes || null,
        medical_aid: leadData.medical_aid || null,
        medical_aid_name: leadData.medical_aid_name || null,
        readiness: leadData.readiness || null,
        contact_name: leadData.contact_name || null,
        contact_phone: leadData.contact_phone || null,
        call_time: leadData.call_time || null,
        preferred_callback_time: callTimeMap[leadData.call_time] || leadData.call_time || null,
        wellness_brief: leadData.wellness_brief || null,
        additional_notes: leadData.additional_notes || null,
        city: leadData.city || null,
        caller_type: leadData.caller_type || null
    };
}
