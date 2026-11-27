# HISTORY.md — значимые завершённые события и смены состояния задачи authentication lifecycle

## Значимые события

1. **2026-11-10:** создан отдельный служебный PR #320 для authentication lifecycle по действовавшему тогда формату из 7 файлов.
2. **2026-11-10:** зафиксирована продуктовая модель AUTH-01–AUTH-07 и owner decisions по mandatory verification, explicit linking, Account & security, Resend/Brevo и Stage-6 external boundary.
3. **2026-11-10:** Лёва подготовил технический план только AUTH-01 против `main e279cb6c032a489a9044ca1191407df887c364b4`; implementation не началась.
4. **2026-11-10:** AUTH-01 был передан Лире по прежнему workflow, но implementation PR так и не появился; после изменения `main` и регламента этот handoff superseded.
5. **2026-11-24:** после завершения большого блока Admin/Super-admin и последующих product tasks владелец потребовал сначала перевести #320 на новый служебный регламент, а затем повторно проверить актуальность auth-плана.
6. **2026-11-24:** ветка #320 синхронизирована с актуальным `main 9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`; старый service head `2b367daa193c7bfe697f8bbe9681bfbf5e4b9c10` оставлен только как Git-history reference.
7. **2026-11-24:** #320 перестроен по текущим `SERVICE_PR_STRUCTURE.md` и `SERVICE_PR_RULES.md`; старый AUTH-01 handoff считается superseded до нового полного планирования.

8. **2026-11-24:** владелец передал повторную проверку актуальности authentication lifecycle плана Лене / GPT-6.2; незавершённое назначение Миры superseded без параллельного дублирования проверки.

9. **2026-11-25:** Лена завершила независимую revalidation AUTH-01–AUTH-07 на main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`: product scope PASS, все семь этапов сохранены, актуальные integration/test dependencies зафиксированы в COMMUNICATION.md. Старый AUTH-01 technical plan остаётся superseded; следующий шаг — полный технический план Лёвы, без implementation/external activation.

10. **2026-11-25:** владелец указал на выход Лены за роль независимого аудитора при самостоятельном назначении Лёвы. Handoff исправлен: результат revalidation передан Мире для координации; технический вывод PASS не изменён.

11. **2026-11-25:** Мира проверила основания revalidation, приняла product-scope PASS и передала Лёве полный технический план всей AUTH-01–AUTH-07 задачи по новому регламенту; implementation остаётся неназначенной.

12. **2026-11-25:** Лёва подготовил полный технический план AUTH-01–AUTH-07 и exact-version research, передал Мире для review/выбора delivery mode. Выявлен и задан владельцу Q-01 о legacy unverified accounts/sessions; решение ожидается. Implementation, CI и external activation не выполнялись.

12. **2026-11-25:** Мира проверила полный технический план Лёвы и поставила coordinator HOLD: открыт owner Q-01 по legacy unverified accounts/sessions; также исправлен неподтверждённый выбор Turnstile на provider-neutral challenge boundary. Implementation не назначена.

13. **2026-11-25:** Q-01 снят после повторной проверки: legacy-grandfathering оказался future-only усложнением без установленного реального пользовательского state. Лёве назначен correction pass: единый mandatory-verification target contract + provider-neutral AUTH-05.

14. **2026-11-25:** Лёва выполнил назначенный correction pass: удалил из PLAN legacy/grandfathering ветвление, связанный owner gate и неподтверждённую data migration; AUTH-05 сделан provider-neutral без обязательного Turnstile adapter. Исправлена атрибуция E-04: ошибка возникла при исходном планировании Лёвы. Результат возвращён Мире на correction review; implementation/CI/external activation не выполнялись.

15. **2026-11-25:** Мира приняла correction pass Лёвы: полный технический план получил coordinator PASS. Delivery mode установлен stacked AUTH-01→AUTH-06 с AUTH-07 final gate; AUTH-01 передан Лире как первая ступень, без intermediate merge в main.

16. **2026-11-25:** владелец напрямую переназначил AUTH-01 с Лиры на Лёву до начала implementation. Лира освобождена от этапа; Лёва реализует первую stacked-ступень. Независимый final technical reviewer будет определён отдельно, поскольку Лёва участвует в реализации.

17. **2026-11-25:** Лёва реализовал AUTH-01 в #388 на stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`: server-only mail foundation, два injected adapters, fake, templates/URL/config/runtime seams. Local author checks и CI 45518743774 (attempt 2) прошли; результат передан Мире на coordinator checkpoint, AUTH-02 не начат. Внешние ресурсы не активировались.

17. **2026-11-25:** AUTH-01 в PR #388 на exact head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a` прошёл coordinator checkpoint Миры: PASS, 0 confirmed current-scope defects. CI exact-head checks/database SUCCESS; переход к AUTH-02a разрешён без intermediate merge и independent Codex review.

18. **2026-11-25:** после coordinator PASS AUTH-01 активирован AUTH-02a — transaction/plugin/state/limits/constraints foundation. По стандартному workflow реализация назначена Лире; новый stacked PR должен базироваться на branch PR #388. User-visible verification остаётся AUTH-02b.

19. **2026-11-25:** владелец напрямую переназначил AUTH-02a с Лиры на Лену до начала implementation. Scope и stacked-base не изменены; Лена становится исполнителем второй ступени и после реализации не может быть независимым final reviewer этой сборки.

20. **2026-11-25:** на переданную техническую эскалацию AUTH-02a Лёва подтвердил конфликт native cleanup Better Auth 1.7.7 с длинными Vico budgets и исправил ошибочное требование общего rate_limit. PLAN/stage PLAN теперь требуют explicit-expiry auth_lifecycle_budget, прежний native limiter и exact schema/capability/cleanup acceptance. STORAGE-DECISION.md передан Лене для её correction pass A-01–A-04 и sequencing diagnostics. #389 head ab2f09f не изменён; author/coordinator PASS, AUTH-02b, merge и внешняя активация не выполнялись.

21. **2026-11-25:** владелец заранее назначил следующую после AUTH-02a stacked-ступень AUTH-02b Лёве / Codex-6.1 Sol. Текущий AUTH-02a остаётся у Лены до coordinator checkpoint; AUTH-02b ещё не активирован и начнётся только после PASS с base на принятом stable head AUTH-02a.

22. **2026-11-25:** AUTH-02a в PR #389 на exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653` прошёл coordinator checkpoint Миры: PASS, 0 confirmed current-scope defects. Проверены исправленный storage design, единый transaction owner, A-02–A-04, sequencing, state/plugin, migrations/capabilities и отсутствие AUTH-02b behavior. CI/acceptance exact-head PASS использованы как подтверждение. Следующая stacked-ступень AUTH-02b заранее назначена Лёве, но активируется отдельным переходом.

23. **2026-11-25:** после coordinator PASS AUTH-02a активирован AUTH-02b — mandatory email verification + resend + UI. По прямому решению владельца implementation назначена Лёве / Codex-6.1 Sol; новый stacked PR должен базироваться на `feat/auth-02a-lifecycle-foundation` exact `06656fef2d85e03c62b7ab69b03fa96ecfc68653`. Recovery/password-create/email-change/unlink и external activation не входят.

24. **2026-11-25:** по прямому решению владельца AUTH-02b переназначен с Лёвы / Codex-6.1 Sol на Лену / GPT-6.2. На момент переназначения на GitHub не было сохранённой AUTH-02b implementation-ветки, PR или commit; accepted base и bounded scope не изменены.

25. **2026-11-25:** владелец назначил Лёве полную техническую проверку незавершённого AUTH-02b #391 и всю последующую auth-реализацию. Review и исправления остаются раздельными фазами: сначала Лёва фиксирует findings без изменения implementation, затем сам исправляет/доводит AUTH-02b; после coordinator PASS реализует AUTH-03 → AUTH-06. Final independent whole-feature reviewer будет другим агентом.

26. **2026-11-25:** после завершённой full review AUTH-02b (HOLD, три confirmed findings) активирован отдельный correction/finalization этап AUTH-02b у Лёвы. Review и implementation не смешивались. Входной head #391 — `bbd35cb60273a2a90cce7aea997d50e4f42943cf`; AUTH-03 остаётся заблокирован до coordinator PASS.

27. **2026-11-26:** AUTH-02b в PR #391 на exact head `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180` прошёл повторный coordinator checkpoint Миры: PASS, 0 confirmed current-scope blocking defects. Credential GET leakage finding закрыт явным POST и no-JS/pre-hydration browser regression; exact-head CI и 19/19 applicable acceptance PASS. Следующая stacked-ступень AUTH-03 остаётся назначенной Лёве и активируется отдельным переходом.

28. **2026-11-26:** после coordinator PASS AUTH-02b активирован AUTH-03 — recovery/reset existing credential + authenticated password creation for Google-only. Исполнитель по прямому решению владельца — Лёва / Codex-6.1 Sol; stacked base — AUTH-02b exact `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180`. Email change/unlink и external activation не входят.

29. **2026-11-26:** AUTH-03 #392 на exact `ce75ff3629a4adae9941703a33f6d0366bd7f570` получил coordinator HOLD. Подтверждены change-password/recovery invalidation defect, plan↔implementation contradiction recovery-token architecture и неполная AUTH-03 mail/context observability. AUTH-04 заблокирован до correction + повторного checkpoint.

30. **2026-11-26:** AUTH-03 #392 на exact `39c07e539a47b8a317b3a274132337a6dc61cfdf` прошёл повторный coordinator checkpoint Миры: PASS, 0 confirmed current-scope blocking defects. Закрыты change/reset invalidation, native opaque+hashed recovery model и AUTH-03 mail/password-context observability. CI #45730609055 и 16/16 applicable acceptance PASS. Следующая stacked-ступень AUTH-04 остаётся назначенной Лёве и активируется отдельно.


31. **2026-11-26:** владелец назначил Аду / Business GPT-6.2 заменой Лёве для дальнейшей работы по authentication lifecycle. Поскольку Лёва уже начал AUTH-06 #395 и его exact-head checks выполняются, текущий handoff не прерывается: Лёва завершает AUTH-06 author verification и STOP. После этого дальнейшие технические обязанности и independent final whole-feature review переходят Аде; она не участвовала в implementation stack.

32. **2026-11-26:** whole-feature coordinator review Миры AUTH-01–AUTH-06 на #395 exact `2eb3f9c303ad1b67d5348664267eca665f079cf7` завершён HOLD. Подтверждён F01: AUTH-05 required email challenge публично различает existing/fresh email из-за existence-dependent challenge bypass. Других confirmed current-scope blockers не установлено. Correction назначена Аде в AUTH-05 #394; AUTH-06 должен быть синхронизирован после нового AUTH-05 PASS. Ада после correction не является independent final reviewer.

33. **2026-11-26:** corrected AUTH-05 #394 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` прошёл повторный coordinator checkpoint Миры: PASS, 0 confirmed current-scope blockers. F01 account-enumeration закрыт локальным existence-independent challenge preflight при открытой SET-02 регистрации; permanent closure semantics сохранены. Exact-head CI #45882443114 и 20/20 applicable connected acceptance PASS. AUTH-06 #395 требует отдельной sync/reverification поверх нового accepted base до повторного whole-feature review.

33. **2026-11-26:** владелец переназначил текущий AUTH-06 sync/reverification с Ады на Лёву / Codex-6.1 Sol. Corrected AUTH-05 #394 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` остаётся принятым; Лёва синхронизирует существующий #395 с новым base и заново выполняет AUTH-06 author/evidence verification. Это назначение относится к текущей подзадаче; AUTH-07 не активирован. После участия в AUTH-06 Лёва не является independent final reviewer assembled feature.

34. **2026-11-26.** Лёва синхронизировал #395 с принятым исправлением AUTH-05 `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`. Локальная матрица на `615d93598daf78945a86fbdc4255bc778ae3403f` получила AUTHOR PASS. Результаты зафиксированы в `stages/AUTH-06/RESULT.md`. Работа передана Мире для повторного whole-feature coordinator review.

34. **2026-11-26:** повторный whole-feature coordinator review AUTH-01–AUTH-06 на #395 exact `615d93598daf78945a86fbdc4255bc778ae3403f` завершён **PASS**. Corrected AUTH-05 F01 включён; 22 AUTH-06 test/evidence файла побайтово совпадают с прежним пакетом. CI #45897164115 и 20/20 applicable connected acceptance SUCCESS; `auth-whole-lifecycle` 62/62. Confirmed current-scope blockers: 0. Следующий отдельный переход — final assembly head в первый implementation PR #388; AUTH-07 ещё не активирован.

35. **2026-11-26:** по прямой команде владельца final assembly stacked AUTH-01–AUTH-06 назначена Аде / Business GPT-6.2. Вход — accepted AUTH-06 #395 exact `615d93598daf78945a86fbdc4255bc778ae3403f`; target — первый implementation PR #388 к неизменившемуся main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`. После сборки intermediate PRs закрываются superseded, затем Ада выполняет final author self-check и applicable exact-head CI/acceptance и STOP для Миры. AUTH-07 не активирован.

36. **2026-11-27:** FINAL-ASSEMBLY #388 получен substantive AUTHOR PASS и CI PASS, но automated HOLD на SA04-K5: два падения до первого upload на immediate editorOperationId assertion. Мира независимо проверила same-head successful/failed runs и source: K5 test/workflow/product blobs идентичны; operationId инициализируется из пустой строки в UUID через React effect, а тест не ждёт readiness. Подтверждён test synchronization defect; product defect не установлен. Bounded K5-CORRECTION назначена Аде, product code менять запрещено.

37. **2026-11-27:** по прямой команде владельца Мира забрала K5-CORRECTION у Ады. В #388 создан новый exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`: test/evidence-only synchronization correction в `tests/browser/sa04-attachments/check.py` (+59/-6), без product/runtime/schema changes. Шесть initial editor operation reads переведены на retrying UUID readiness assertion с safe diagnostics. Source-level correction self-check PASS; targeted K5 ещё не запускался, automated gate остаётся HOLD.

38. **2026-11-27:** K5-CORRECTION exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601` прошёл targeted connected verification. Temporary diagnostic PR #396 имел diff только `tests/browser/sa04-attachments/check.py` и был закрыт без merge. K5 run #45922622929 / job #140256622743 SUCCESS; merge-ref tree идентичен head tree; `SA04_K5_CONNECTED_PASS 33`; artifact #15165481754 подтверждает 33 cases, `external=[]`, `page_errors=[]` и six readiness PASS. Старое точное failing value не было воспроизведено и остаётся неизвестным. Следующий отдельный шаг — final exact-head CI + applicable acceptance на #388.

39. **2026-11-27:** final automated gate assembled #388 exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601` завершён **PASS**. CI #45926789854 SUCCESS: 3342 standard tests, 1998 PostgreSQL tests, auth whole-lifecycle 62/62, schema manifest 76 tables и runtime/split-authority/credential probes PASS. Fresh applicable connected acceptance — 20/20 SUCCESS, включая K5; failures/cancelled/in-progress 0. Merge-ref tree идентичен implementation head. Поскольку Мира authored K5 correction, она не может independently whole-feature-review собственный final head; следующий review route требует прямого назначения владельца квалифицированному non-implementer.

40. **2026-11-27:** после final automated PASS exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601` review route скорректирован из-за independence conflict: Мира authored K5 correction и не может whole-feature-review собственный final head. AUTH-07 активирован; первый final whole-feature review назначен Лире / GPT-6, которая не участвовала в auth implementation (AUTH-01 был снят с неё до начала реализации). При PASS Лиры следующим отдельным переходом планируется Марк / Codex-6 Sol как independent final technical reviewer на том же exact head.

41. **2026-11-27:** владелец переназначил первый AUTH-07 whole-feature review с Лиры на Лену / GPT-6.2 до начала review. Лена ранее участвовала в AUTH-02a implementation и начинала AUTH-02b, поэтому её first review не считается independent final technical review. При PASS Лены обязательный independent gate остаётся за Марком / Codex-6 Sol на том же exact head.

42. **2026-11-27:** Лена завершила first AUTH-07 whole-feature review #388 exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601` с **HOLD**: 3 confirmed current-scope findings (Account & security state after password creation, saved locale, same-document replacement proof). K5 accepted; automated PASS прежнего exact head сохраняется как execution evidence, не review PASS. Findings и limitations — stages/AUTH-07/REVIEW.md. Лена STOP, handoff Мире для correction route; independent gate Марка не активирован. Implementation/main unchanged.

43. **2026-11-27:** Лена реализовала три AUTH-07 corrections в #388 exact `5b29469fe51e716b483d4e610dd90705f5409029` и завершила substantive author source self-check. По новой прямой команде владельца запуск/проверка тестов переданы Мире; Лена тесты больше не запускает. RESULT и handoff оформлены, Лена STOP; Мира — whole-feature coordinator reviewer и ответственная за automated gate, Марк ещё не активирован. Merge/Stage-6 blocked.

44. **2026-11-27.** После coordinator PASS Миры владелец поручил Лёве финальное техническое ревью #388 на `5b29469fe51e716b483d4e610dd90705f5409029` с учётом его участия в AUTH-06. Результат **HOLD**. В Chromium подтверждены три предыдущих исправления и два новых дефекта гостевого восстановления пароля. Лёва STOP, результат передан Мире. [Заключение](stages/AUTH-07/FINAL-TECHNICAL-REVIEW.md)

45. **2026-11-27:** AUTH-07-CORRECTION-2 в #388 exact `5d8bdaad117e59326f5eae61ea13613b0d45df7c`: F-B2-03/F-B2-04 реализованы, AUTHOR SOURCE SELF-CHECK PASS; только reset route и connected regression file. Лена тесты не запускала по прямой команде владельца, fresh automated gate не закрыт. RESULT оформлен, Лена STOP, повторный final technical review назначенного владельцем Лёвы. Merge/Stage-6 blocked.

46. **2026-11-27.** После coordinator PASS Миры Лёва завершил повторное финальное техническое ревью #388 на `5d8bdaad117e59326f5eae61ea13613b0d45df7c` с **PASS**. F-B2-03 и F-B2-04 закрыты, в Chromium дополнительно проверено открытие новой ссылки во время ожидания предыдущего ответа. Лёва STOP, результат передан Мире для доклада владельцу. [Заключение](stages/AUTH-07/FINAL-TECHNICAL-REVIEW-2.md)
