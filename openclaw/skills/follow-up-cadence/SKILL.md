---
name: follow-up-cadence
description: Never let a deal go cold — schedule and draft follow-ups for quotes, demos, ghosted threads, and renewals. Use when the user asks "chase this," "follow up," or wants a reminder system for open deals.
---

# Follow-Up Cadence

80% of deals need 5+ touches; most sellers stop at 2. This skill is the memory.

## Default cadences

| Situation | Touches | Rhythm |
|---|---|---|
| Proposal sent | 4 | Day 2 (confirm received + offer walkthrough), Day 5 (add value: relevant insight), Day 10 (ask for blockers), Day 15 (break-up w/ door open) |
| Post-demo silence | 3 | Day 2 recap + next step, Day 6 champion-enablement asset, Day 12 break-up |
| "Contact me next quarter" | 2 | 2 weeks before the date (warm-up insight), on the date (restart ask) |
| Renewal | 3 | T-60 value recap, T-30 renewal terms, T-7 confirm |

Every follow-up must **add something new** — an insight, an answer, a relevant example.
"Just checking in" is banned.

## Workflow

1. Intake: deal name, stage, last touch, agreed next step, deadline (pull from `crm-hygiene`
   notes when available).
2. Pick/adapt a cadence and write **all drafts up front** in the user's voice, each ≤ 80 words,
   each referencing the specific thread.
3. Schedule reminders with whatever the runtime offers (OpenClaw cron/reminders, calendar
   tools); label each with deal + touch number.
4. When a reminder fires: check the thread first — if the prospect replied or the deal moved,
   cancel remaining touches and re-plan instead of firing blindly.

## Rules

- Stop immediately on any opt-out or clear "no," and record it in `crm-hygiene`.
- Drafts are queued for user approval by default; autonomous sending only if the user has
  explicitly enabled it for that channel.
- After a break-up email with no reply, downgrade to a light-touch nurture (quarterly value
  note) rather than deleting the lead.
