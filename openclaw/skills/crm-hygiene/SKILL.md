---
name: crm-hygiene
description: Keep the pipeline truthful — log activities, update deal stages, run weekly pipeline reviews, and produce forecasts. Use when the user mentions CRM updates, pipeline review, forecast, or "where are all my deals?"
---

# CRM Hygiene & Pipeline

A pipeline you can't trust produces a forecast you can't defend.

## Deal record (canonical fields)

Whether the "CRM" is HubSpot/Close via connected tools, a spreadsheet, or a markdown file in
the workspace, every deal keeps: `company, contact(s), stage, value, close date, next step +
due date, last touch, MEDDICC score, loss/win reason`. **A deal with no dated next step is a
data bug** — flag it.

## Stages (default; adapt to the user's)

`Lead → Contacted → Qualified → Proposal → Negotiation → Closed-Won / Closed-Lost / Nurture`

Stage changes require evidence (a reply, a call, a signed doc) — never advance a deal because
time passed.

## Routines

**After every sales interaction** (call notes, email thread, meeting):
1. Extract: outcome, commitments (both sides), sentiment, next step + date.
2. Update the deal record; queue the follow-up via `follow-up-cadence`.

**Weekly pipeline review** (run on demand or scheduled):
- Table of open deals sorted by close date, with 🔴 flags: past-due next step, no touch > 14
  days, close date in the past, stage stuck > 30 days.
- Top 3 recommended actions for the week, each tied to a flagged deal.
- Movement since last week: new, advanced, slipped, closed.

**Forecast** (monthly/quarterly):
- Weighted: stage-probability × value (defaults: Qualified 20%, Proposal 40%, Negotiation
  60%, adjust to the user's history when data exists).
- Present best case / commit / worst case with the 3 assumptions that swing it most.

## Rules

- Read/write only the CRM tools and files the user connected; show a diff of bulk updates
  before applying.
- Never delete records — mark lost/invalid with a reason instead.
- Loss reasons are gold: aggregate them quarterly and report the top pattern to the user.
