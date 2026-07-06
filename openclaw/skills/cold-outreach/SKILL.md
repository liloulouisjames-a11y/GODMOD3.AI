---
name: cold-outreach
description: Write personalized cold emails, LinkedIn DMs, and multi-touch outreach sequences. Use when the user wants to contact prospects, write a cold email, or launch an outbound campaign.
---

# Cold Outreach

Write outreach a busy stranger actually answers. Personal, short, one clear ask.

## Message anatomy (email)

1. **Subject:** 2–5 words, lowercase-casual, specific ("your QA hiring spree", "acme + godmod3").
   Never clickbait.
2. **Opener (1 line):** the *reason for reaching out now* — a trigger event, something they
   published, a specific observation. If you can't personalize the first line, don't send.
3. **Bridge (1–2 lines):** connect their likely pain to what the user sells. Speak outcome, not
   features ("teams like X cut review time 40%" — only if the proof is real).
4. **Ask (1 line):** one low-friction CTA. "Worth a 15-min look next week?" beats "Book my calendly."
5. **Signature:** name, company, one-line credibility. No image-heavy signatures, no attachments.

Hard limits: ≤ 120 words, ≤ 1 link, zero buzzwords ("synergy", "circle back", "revolutionary").

## Sequence template (default 4-touch, ~2 weeks)

| Touch | Day | Channel | Angle |
|---|---|---|---|
| 1 | 0 | Email | Trigger event + pain hypothesis |
| 2 | 3 | Email reply-bump | New info (case study, insight) — never "just following up" |
| 3 | 7 | LinkedIn | Short DM referencing email, softer ask |
| 4 | 13 | Email | Break-up note; leave door open, ask for referral to right person |

## Workflow

1. Pull lead records (from `lead-generation` output or user's list). One sequence per segment,
   personalization per lead.
2. Draft touch 1 for the top 5 leads first; show the user before generating the rest, and adapt
   to their voice edits.
3. Output ready-to-send drafts grouped by lead, with send-day labels. **Never send
   autonomously** — drafts only, unless the user has explicitly wired and approved a send tool.

## Rules

- Consent & law: include opt-out language where required, honor unsubscribes, no purchased-list
  blasting (CAN-SPAM / GDPR / CASL).
- No fabricated familiarity ("loved your recent post" only if you actually read it — cite it).
- If reply comes in, route to `discovery-qualification`; if silence after touch 4, log to
  `crm-hygiene` as nurture.
