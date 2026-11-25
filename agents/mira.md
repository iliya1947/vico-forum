# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. AUTH-01: coordinator PASS.
2. AUTH-02a: coordinator PASS.
3. AUTH-02b #391: coordinator PASS на exact head `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180`.
4. Последний credential transport finding закрыт; no-JS/pre-hydration regression подтверждает POST без credentials в URL.
5. Exact-head CI и 19/19 applicable acceptance PASS использованы как supporting evidence после самостоятельной проверки.
6. Следующая stacked-ступень — AUTH-03, исполнитель по прямому решению владельца Лёва; пока не активирована.
7. Final independent whole-feature reviewer определяется отдельно.

## Следующий переход

При следующем продолжении активировать AUTH-03 поверх принятого AUTH-02b head. Не merge intermediate PRs и не начинать final review.
