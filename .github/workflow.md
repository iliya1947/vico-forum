# Admin panel — current workflow

- Service PR: **#251**
- Current main/base: **`c1109dc8c5c499b63dd6e4d2f76bce96fadb2cd5`**
- Current stage: **Settings SET-06 Privacy — Lev technical plan delivered; Mira scope/fit review**
- SET-05 implementation #309 + docs #310: **merged; SET-05 fully closed**
- SET-06 approved product boundary: persisted per-user public online visibility, default ON, authenticated opt-out, authoritative exclusion from public list/count, heartbeat cannot republish opted-out user
- Lev technical plan: [#6722989280](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6722989280), against exact current main above
- Plan covers: one forward preference migration; authoritative presence read/write and per-user concurrency boundary; protected Privacy Settings route; response cache boundaries; nativePG/real-browser/privilege verification
- **Мира**: review technical plan for scope/fit, then separately route SET-06 implementation
- **Лёва**: planning complete; stopped, no project code changed
- **Лира**: stopped; no SET-06 implementation assigned before Mira plan review
- **Марк**: unassigned
- Next: **Mira plan review → separate SET-06 implementation assignment**
- No SET-06 implementation PR, runtime/DB changes, CI PASS or acceptance claimed.
- Permanent docs follow a separate post-merge factual closeout.
- No universal settings store, second RBAC/deputies, unrelated privacy/notifications, Stage6 or production work.
