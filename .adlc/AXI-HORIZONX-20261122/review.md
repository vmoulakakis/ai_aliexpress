# AXI-HORIZONX-20261122
Standard UI change. Review pending. Preserve data/auth/tracking and >=EUR50; seller images and classifications never imply verification. Rollback: revert UI branch to7710590. No database changes. New read proxy is bounded to one fixed existing edge with validated parameters, no user-supplied URLs or paid inference.

Independent static QA found three P2 issues: small disclosure contrast, unmatched empty-search suggestions, and possible gallery focus loss when the focused card is unmounted. Fixed by semantic muted contrast, explicit Greek search aliases with a regression test, and focus on the stable gallery region before arrow-driven selection. Four Node tests/typecheck pass after fixes. Actual browser check remains pending.
