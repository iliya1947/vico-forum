# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-10 repeated independent technical review
- Main/base: `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`
- Implementation PR: #290 Draft/open/unmerged
- Reviewed stable exact head: `9fecd925a256062e9892235f4ba02ed3147de1e3`
- Technical planner/reviewer now: Лёва; implementer: Лира; coordinator: Мира
- Technical plan approved; AP10-PLAN-MIRA-01..06 закрыты
- Coordinator whole-PR PASS на reviewed head; AP10-MIRA-01..11 закрыты
- Independent verdict: NOT PASS — AP10-LEV-01 [P3], create targetId NUL → unhandled PG 22021 / HTTP 500 вместо typed 400
- [Полный review/evidence #6684522908](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6684522908)
- Exact-head CI #42213405436: SUCCESS; isolated browser #42213405385: SUCCESS (author CI)
- Собственное evidence: 78 PostgreSQL tests + 288 app/route/UI tests; metadata scripts/build PASS; actual Chromium/Worker/Better Auth/PG 18 case groups PASS; отдельные HTTP/domain probes подтвердили finding
- Implementation во время review не менялся; review завершён
- Следующий шаг: Лира исправляет подтверждённый AP10-LEV-01 в #290, выполняет applicable exact-head checks/browser evidence и фиксирует новый stable head; затем Мира начинает новый coordinator cycle → после PASS independent review Лёвы того же head
- Documentation PR #291 отдельный; approval/merge этим review не выданы
- Owner visual acceptance не инициировалась; production/Stage 6 не менялись
- AP-11/Settings, owner-role/last-manager cleanup не начинались; Марк не назначен

- Мира независимо перепроверила AP10-LEV-01: current-scope finding подтверждён. Create targetId с NUL проходит слабую domain identity validation и доходит до PostgreSQL text parameter, поэтому canonical create HTTP boundary выдаёт 500 вместо typed private/no-store 400; side effects не создаются
- Bounded AP10-LEV-01 correction package зафиксирован для Лиры в service-channel.md; implementation head остаётся `9fecd925a256062e9892235f4ba02ed3147de1e3` до её изменения
- Лёва review завершён и реализацию не меняет; Марк не назначен

- AP10-LEV-01 targeted corrected-head pass complete on `ef313919f6613c54db6ddb50765c968744101306`: original cause closed; 5-file delta reviewed with no new current-scope finding
- Exact-head CI #42218475676 and isolated Chromium #42218475943: SUCCESS
- Next step: final regression/evidence sweep of the same stable head against the already closed AP-10 scope; only after coordinator PASS hand off the same exact head to Лёва for repeated independent technical review

- Coordinator final regression/evidence sweep complete on `ef313919f6613c54db6ddb50765c968744101306`: AP10-LEV-01 closed; no confirmed current-scope defects remain; coordinator verdict PASS
- Exact-head CI #42218475676 and isolated Chromium #42218475943: SUCCESS; main/base unchanged; #251 remains exactly 7 files; #291 unchanged
- Repeated independent technical review assigned to Лёва on the same exact head; implementation remains frozen during review. Марк not assigned
- Next step: Лёва independently reviews PR #290 exact head `ef313919f6613c54db6ddb50765c968744101306` and records verdict/evidence; any implementation head change restarts coordinator cycle
