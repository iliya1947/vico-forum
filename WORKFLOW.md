# WORKFLOW.md — текущее состояние и следующий переход

1. Implementation PR #388 merged в main: `b1a1799b5927ed647eff9a8cbd5c03282f8a2d87`.
2. DOCS-CLOSEOUT PR #398 после AUTHOR PASS Лены, whole-docs review Миры, F-DOCS-01 correction и COORDINATOR RE-REVIEW PASS merged в main: `c49897181388b4a78f8e8248dc6508551df576c4`.
3. **Repository/local-CI часть authentication lifecycle #320 завершена.** Критерии TASK выполнены: полный план; AUTH-01–AUTH-07 implementation/review; whole-lifecycle/security acceptance; pre-Stage-6 gate; отдельный docs closeout.
4. Stage 6 **не активирован**. Реальные Resend/Brevo credentials/DNS/delivery, production Google OAuth/Owner binding, конкретный anti-bot provider/resources, external migrations/runtime changes, edge rules и deployed acceptance остаются заблокированы до отдельной команды владельца.
5. Лена STOP. Лёва STOP. Марк/Лира не подключаются. Активной работы по #320 нет.
6. Служебный #320 сохраняется как контекст authentication lifecycle и будущей разрешённой Stage-6 внешней активации; сам service PR в main не merge.

## Следующий переход

Не продолжать #320 без отдельного решения владельца о Stage 6. Текущая repository/local-CI работа завершена; дальнейшая работа выбирается из общей очереди проекта.
