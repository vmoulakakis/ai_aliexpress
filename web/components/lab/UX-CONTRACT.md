# FOUND. LAB interaction contract

Business source: current user request for an MVP of robotics + local AI equipment; root AGENTS.md and DESIGN.md govern honesty, scope and evidence. Implemented at `/lab`; all prior routes and backend APIs are preserved.

| Capability | Canonical owner | Source of truth | Allowed variant | Verification |
|---|---|---|---|---|
| Form | EquipmentLab native fieldsets / validation | planner.ts, this contract | numeric planning, text brief | unit + browser |
| Scrollbar | lab.module.css route root and descendants | component DESIGN.md | table-only horizontal overflow | browser |
| Toast | EquipmentLab notice live region | this contract | status, storage error | browser |
| Disclosure | native details / summary | this contract | sources and limitations | keyboard + browser |
| Save/read | readSaved, createPlan, STORAGE_KEY | planner.ts | one explicitly saved browser-local plan | unit + browser |

No authentication, payment, checkout, outbound messages, lead submission or server persistence. Text entered in either field never leaves the browser. Persist only after explicit Save; replace the single local draft on a subsequent Save. Invalid or obsolete storage is ignored. Storage denial yields a clear CSV recovery path. No destructive control.

Goal text and numeric amounts are transient local state and never URL parameters. URL records only selected preset, tier, and whether a plan is visible. The share action intentionally shares only the starting preset and tier; it never claims to share the full customized plan. CSV shares the full current plan, on the user's explicit action. Formula-leading cells are escaped.

Submit validates, preserves input, then focuses the result heading and scrolls it into view. Invalid submit focuses the relevant invalid field and shows an inline correction. Keyword matching either selects a uniquely matched preset or presents an honest no-match error; it does not fabricate an AI interpretation. Numeric line edits recalculate the visible total. Switching mission resets per-line overrides and hides the old result. Selecting a different tier resets overrides because the equipment set changes.

Known price and performance claims are not inferred from scenario arithmetic. Saved and exported plans retain limitations. The engine does not rank by affiliate commission. Catalog information is a sourced research snapshot. Source links open new tabs with noopener and noreferrer.

State coverage: initial, empty saved list, invalid budget, ambiguous/unmatched query, matched preset, plan, live recalculation, over-budget, sources open, comparison open, saved/restored, denied storage, download, denied clipboard, mobile, reduced-motion, keyboard. The small comparison has three rows; render all is deliberate. No network search, pagination, server mutation, or loading state is applicable.
