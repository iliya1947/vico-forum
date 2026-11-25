# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. AUTH-01: PR #388 / head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`, coordinator PASS.
2. AUTH-02a: PR #389 / head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`, author PASS + coordinator PASS.
3. AUTH-02b: draft PR #391 / current exact `bbd35cb60273a2a90cce7aea997d50e4f42943cf`; AUTHOR PASS отсутствует; P7 HTTP smoke 500, причина не установлена.
4. Лена STOP и передала незавершённый AUTH-02b.
5. По прямому решению владельца текущая review-фаза передана Лёве.
6. После review Лёва сам отдельным implementation-этапом исправляет/доводит AUTH-02b; после coordinator PASS остаётся исполнителем AUTH-03 → AUTH-06.
7. Лёва и Лена участвовали в implementation stack; final independent whole-feature reviewer определяется отдельно.

## Следующий переход

После завершения полной проверки Лёвой принять findings как отдельный review result. Не смешивать review с исправлением. Затем передать тому же Лёве implementation correction/finalization AUTH-02b. Coordinator checkpoint только после нового stable exact head и author evidence.
