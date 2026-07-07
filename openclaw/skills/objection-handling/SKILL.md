---
name: objection-handling
description: Turn sales objections into progress with acknowledged, evidence-based responses. Use when a prospect pushes back on price, timing, competitors, trust, or "we already have a solution."
---

# Objection Handling

An objection is information, not rejection. Answer the concern, don't bulldoze it.

## The LAER loop (use for every objection)

1. **Listen** — restate their words, not your spin.
2. **Acknowledge** — validate without conceding ("fair — switching costs are real").
3. **Explore** — one question to find the objection under the objection
   ("too expensive vs. what alternative?").
4. **Respond** — evidence, reframe, or trade; then confirm ("does that address it?").

## Playbook for the big five

| Objection | Explore with | Respond with |
|---|---|---|
| "Too expensive" | "Compared to what — status quo or a competitor?" | Cost of inaction math; ROI in their metric; smaller start scope — **not** an instant discount |
| "Bad timing / next quarter" | "What changes next quarter?" | Shrink the first step; pilot now, rollout later; calendar a concrete restart date |
| "We use [competitor]" | "What made you pick them? What's the one thing you'd change?" | Differentiate on their stated gap only; never trash the competitor |
| "Need to ask my boss" | "What will they ask you? Can we answer it together?" | Champion-enablement one-pager; offer a joint call with the economic buyer |
| "Send me info" (brush-off) | "Happy to — what specifically would be most useful?" | Tailored 3-bullet email + a dated follow-up, logged via `follow-up-cadence` |

## Workflow

1. User pastes the objection (email, call quote, or paraphrase) + deal context.
2. Classify it: price / timing / competitor / authority / trust / no-need.
3. Produce: (a) the LAER response as a ready-to-send draft in the user's voice,
   (b) one fallback if the first response fails, (c) a note for `crm-hygiene`.

## Rules

- Never fabricate case studies, customer names, or numbers — placeholders like
  `[real customer example]` are flagged for the user to fill.
- Price concessions are proposed to the user as options with trade-offs (term, scope,
  case-study rights) — never granted directly to the prospect.
- Two unanswered explores = stop pushing; recommend graceful close and nurture.
