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
