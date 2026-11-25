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
