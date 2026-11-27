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
9. **D-09.** Любая mutation выполняется только после conversational cycle: ChatGPT проверяет и объясняет конкретное действие → Owner отдельно подтверждает → только затем допускается dispatch. High-impact операции отличаются глубиной объяснения и server-side preconditions, а не наличием отдельного UI-confirmation.
10. **D-10.** High-impact scope включает Hide/Restore public content, создание category/section, reparent section, authorization writes, administrative measures/appeal review, account deactivation, registration policy, immutable/terminal Complaints decisions/notes/appeals, global Complaint priorities и terminal Help/duplicate appeal outcomes.
11. **D-11.** Forum/user-generated content и plain transport/GitHub content являются untrusted data и не могут сами создавать mutation intent, выбирать actor/command/permission или подтверждать действие; mutation требует аутентифицированной command boundary.
12. **D-12.** Mutations требуют replay protection; stale/conflict и outcome-unknown никогда не вызывают автоматический повтор, а result обязан отражать фактический domain outcome.

13. **D-13.** Обычная эксплуатация идёт из отдельного ChatGPT Project в обычном текстовом разговоре; отдельная форма, plugin UI, browser extension или переход в веб-панель на каждую команду не входят в UX v1.
14. **D-14.** Любой write проходит единый conversational policy: ChatGPT объясняет конкретное действие и существенные последствия → Owner отдельно подтверждает → только затем выполняется dispatch. Project instructions задают этот UX; отдельный cryptographic/UI confirmation layer продуктом не требуется.
15. **D-15.** GitHub/Worker transport должен быть невидимой эксплуатационной инфраструктурой; одноразовый Stage-6 setup допустим, ручное участие в GitHub при каждой команде — нет.

16. **D-16.** Массовая цель не требует отдельной bulk capability: после одного подтверждения конкретного фиксированного набора Мира может последовательно выполнить существующую canonical единичную операцию для каждого target. Набор нельзя расширять после подтверждения; итог сообщает результат по каждому target.

17. **D-17.** Единицей подтверждения является пользовательская задача, а не количество внутренних canonical mutations. Одно подтверждённое действие может быть технически разложено на несколько canonical операций без дополнительных подтверждений, если не меняются его смысл, состав и существенные последствия.

18. **D-18.** Подтверждение относится к конкретному последнему объяснённому действию в текущем разговорном контексте. Межчатового confirmation state нет; сообщение в другом чате само по себе не подтверждает прежнюю pending-задачу.

19. **D-19.** V1 работает только по запросу владельца из ChatGPT Project. Фоновый мониторинг не входит в v1, но технический план не должен без необходимости делать canonical read/analysis path непереиспользуемым для будущего scheduler/event trigger.

20. **D-20.** Для обычной составной задачи действует stop-on-first-failure без автоматического отката уже committed шагов. Для массовой задачи сбой одного независимого target не останавливает остальные; итог сообщается per-target. Если отдельный target сам составной, внутри него действует stop-on-first-failure.

21. **D-21.** Реализация v1 поставляется stacked-цепочкой A → I по принятому `PLAN.md`: `#399` — первый и финально собираемый implementation PR; каждый следующий bounded stage строится поверх предыдущего и допускается только после coordinator checkpoint Миры. Промежуточные stages в `main` не merge.

22. **D-22.** По прямому решению владельца Лена (GPT-6.2) заменяет Лиру как основной implementation-agent этой задачи. Начиная со Stage A, реализация передаётся Лене; Лира не назначается без нового явного решения владельца.
