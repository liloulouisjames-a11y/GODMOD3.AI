---
name: lead-generation
description: Research and build qualified prospect lists. Use when the user wants to find leads, build a target account list, research an ICP (ideal customer profile), or enrich prospect data before outreach.
---

# Lead Generation

Turn a fuzzy "find me customers" ask into a ranked, enriched prospect list.

## Workflow

1. **Nail the ICP first.** If not already defined, ask (or infer from the user's product/site):
   - Industry / vertical, company size (employees, revenue), geography
   - Buyer persona: title, seniority, department, pains the product solves
   - Disqualifiers (competitors, wrong stack, too small/large)
2. **Source candidates.** Use available tools (web search, connected CRM/company DBs, files the
   user provides). Prefer sources the user already has access to; never scrape behind logins.
3. **Enrich each lead** into a consistent record:

   | Field | Example |
   |---|---|
   | Company | Acme Robotics |
   | Website | acme.example |
   | Size / Revenue | 120 emp / ~$15M |
   | Contact + Title | Dana Reyes, VP Operations |
   | Trigger event | Just raised Series B; hiring 3 ops roles |
   | Pain hypothesis | Manual QA is bottleneck (from job posts) |
   | Fit score | A / B / C |

4. **Score & rank.** A = strong ICP fit + trigger event; B = fit, no trigger; C = partial fit.
   Explain the score in one line so the user can sanity-check.
5. **Deliver** as a table or CSV, sorted A→C, plus a one-paragraph summary of patterns found
   (best verticals, common trigger events) to sharpen the next pass.

## Rules

- Only collect business-contact data from public/consented sources; no personal emails or data
  that violates the source's terms.
- A short verified list beats a long guessed one — flag any unverified field as `(unverified)`.
- Always end with a suggested next step: which 5–10 leads to send to `cold-outreach` first.
