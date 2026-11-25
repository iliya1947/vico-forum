# stages/AUTH-01/RESULT.md — реализация Mail foundation, author self-check и evidence первой stacked-ступени

## Реализация

Implementation PR: [#388](https://github.com/iliya1947/vico-forum/pull/388), base `main`, branch `feat/auth-01-mail-foundation`.
Stable exact head: `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`.
Baseline: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
Исполнитель: Лёва. Author self-check выполнен; coordinator checkpoint Миры ещё не выполнен.

- Server-only `sendAuthMail` возвращает только accepted/rejected/unavailable/uncertain/disabled. Recipient, keys, provider response и raw errors в result не попадают.
- Resend/Brevo используют обязательный injected fetch, fixed endpoints и один configured provider без retry/failover. Timeout/потеря ответа/невалидный success acknowledgement — uncertain. Ограничены timeout и response size; redirects не исполняются.
- Bounded private fake inbox доступен только local/test, без HTTP debug endpoint. Worker capability request-local/lazy. Production send жёстко disabled даже при наличии keys/fixtures; внешнего activation switch на этой ступени нет.
- HTML/text templates используют отдельный canonical `authMail` namespace, reviewed RU/HE packs, существующие registry/resource loader/i18next fallback и direction. General UI namespace ради письма не загружается. Monitoring test проверяет отсутствующие mail bundles отдельно от повреждённого common bundle.
- Action URL строится от проверенного trusted origin и повторно валидируется перед send: allowlisted paths, canonical callback, locale-local path-only returnTo. Query/hash-bearing return destinations пока не принимаются. Token issuance/verification и новые auth routes относятся к следующим ступеням.
- Signup/session/auth callbacks, schema, dependencies и anti-bot provider не менялись. Постоянные продуктовые документы обновляются отдельным docs closeout всей задачи.

## Проверки

| Проверка | Фактический результат |
| --- | --- |
| Targeted auth/mail/localization | PASS: 15 files / 164 tests; 84 новых mail tests. Production-code часть соответствует финальному head; последний commit меняет только DB Monitoring regression |
| TypeScript | PASS: tsc -b, включая новый namespace module в composite Node project и изменённый DB test |
| Lint | PASS: 0 errors; existing unused eslint-disable warning в app/forum/ui.test.tsx:174 |
| Production build | PASS: client + SSR/Worker |
| Canary build/client isolation | PASS: synthetic Resend/Brevo keys в build environment; scan 130 client JS files без canaries, mail key names и provider endpoints |
| CI exact head | PASS (attempt 2) — [run 45518743774](https://github.com/iliya1947/vico-forum/actions/runs/45518743774) на указанном stable head |
| CI whole unit | PASS: 247 files / 3280 tests |
| CI PostgreSQL 17 / Worker | PASS: 118 files / 1834 tests, clean PostgreSQL 17, manifest/privilege/provisioning probes и built Worker/Better Auth HTTP smoke |

Local tools: Node 24.19.0 и уже установленные project tools; repository требует Node 24.21.0/pnpm12.3.4, pinned setup проверяется CI. Local PG17 отсутствовал; native DB и built Worker/Better Auth regressions проверяются CI.

Ранний local full-unit run не является PASS evidence: были timeouts, включая existing edit-recovery/destination-like-label, воспроизведённый и на исходном коде без AUTH-01. Run остановлен после изменения mail namespace. Final targeted и CI results выше учитываются отдельно; unrelated Editor code не менялся.

Первый attempt финального CI упал только на неизменённом SET-02 shell test (ожидание feedback после 409). Этот suite на исходном коде без AUTH-01 прошёл локально три повтора по 9 tests; unit job также проходил на предыдущем production-code-equivalent head. Повторён только failed checks job на том же exact head, без изменения/отключения Settings tests: attempt 2 — PASS. Database success относится к тому же head. Это observation о test stability, не установленный root cause нового product defect.

Mail tests запрещают global fetch: все adapters используют fixtures. Реальных provider/mail/Google/anti-bot calls, production DB operations или deployment не было. Transport acceptance не означает inbox delivery. Browser/deployed mail acceptance не заявляется.

## Следующий переход

Мира выполняет coordinator checkpoint AUTH-01 на указанном exact head. Лёва AUTH-02 самостоятельно не начинает и независимую final review собственной реализации не проводит. Intermediate merge в main не выполняется; #320 не merge.
