---
name: proposal-builder
description: Assemble proposals, quotes, and one-pagers that close. Use after a qualified discovery call, when the user says "send them a proposal/quote/pricing," or for renewal/upsell docs.
---

# Proposal Builder

A proposal is the discovery call played back with a price tag. No new arguments here.

## Structure (default, ~2 pages)

1. **Their situation** (3–4 lines) — pains and goals *in the prospect's own words* from the
   MEDDICC notes. This section wins the deal; write it first.
2. **Proposed outcome** — the measurable result, tied to their metric ("cut review time from
   3 days to 4 hours"). One sentence, bold.
3. **Solution & scope** — what's included, keyed to each stated pain (pain → capability →
   outcome rows). Explicitly list what's *out* of scope.
4. **Plan & timeline** — kickoff → milestone → live, with dates and owners on both sides.
5. **Investment** — up to 3 options (Good/Better/Best). Anchor with the recommended middle
   option pre-selected. Show price per outcome-period, not just a lump sum.
6. **Proof** — 1–2 relevant case studies or references (real ones only).
7. **Next step + expiry** — signature line or booking link, and an honest validity date.

## Workflow

1. Ingest: MEDDICC scorecard / discovery notes, the user's pricing rules, any brand template.
2. Draft the doc in markdown first for fast iteration; on approval, export to the format the
   user wants (PDF/DOCX/slides via available document skills).
3. Generate a 5-line cover email that names the champion's goal and the proposed next step.
4. Log value + expected close date to `crm-hygiene`; schedule the chase via `follow-up-cadence`.

## Rules

- Pricing comes only from the user's price book/rules; if none given, leave `[PRICE]`
  placeholders and ask.
- No invented testimonials, logos, or metrics. No fake "expires in 24h" urgency — real
  deadlines only.
- Every proposal ends with exactly one clearly-marked next step.
