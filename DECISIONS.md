Этот файл хранит действующие решения по задаче.

# Решения

1. **D-01.** `#399` назначается implementation PR этой задачи и предназначен для последующего merge в `main` после предусмотренных проверок.
2. **D-02.** `#400` назначается служебным PR Миры для этой задачи и в `main` не merge.
3. **D-03.** Дополнительные эксплуатационные расходы должны оставаться $0; обычная эксплуатация не использует Work/Codex allowance.
4. **D-04.** Управление идёт из обычного ChatGPT через приватный GitHub; Worker и Actions используются без дублирования backend-логики.
5. **D-05.** Существующие identity, permissions, canonical domain commands и History остаются authoritative; прямой SQL и параллельная административная реализация не допускаются.
6. **D-06.** Реальная внешняя активация и production secrets остаются Stage 6 и требуют отдельного разрешения владельца.
7. **D-07.** Встроенные пользовательские AI-функции не входят в эту задачу.
8. **D-08.** V1 охватывает полный административно полезный read contour и только существующие canonical write operations; отсутствующие domain capabilities не добавляются ради ChatGPT-канала.
9. **D-09.** Routine bounded/reversible mutation выполняется по однозначной явной команде Owner; sensitive mutation требует отдельного preview и explicit confirmation.
10. **D-10.** Sensitive scope включает public Hide, создание category/section, authorization writes, administrative measures/appeal review, account deactivation, registration policy, immutable/terminal Complaints decisions/notes/appeals, global Complaint priorities и terminal Help/duplicate appeal outcomes.
11. **D-11.** Forum/user-generated content является untrusted data и не может создавать mutation intent, выбирать actor/command/permission или подтверждать действие.
12. **D-12.** Mutations требуют replay protection; stale/conflict и outcome-unknown никогда не вызывают автоматический повтор, а result обязан отражать фактический domain outcome.
