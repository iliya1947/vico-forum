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
