# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Complaints Packages1–7 merged в main; current baseline `c8a9edf2a3481e08666c025474bf714553a13ffb`.
- Полные независимые аудиты Лиры и Миры завершены; публикация findings выполнена по команде владельца.
- После взаимной независимой перепроверки оба расхождения подтверждены как current-scope: MIRA-COMPLAINTS-01/02.
- [Сверка timezone finding](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6613895157), [сверка Unicode finding/итог](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6614499533), [повторное подтверждение Лиры](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6613922747).
- Лёва подготовил bounded technical plan по [назначению #6614520209](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6614520209); application/tests не менялись, correction PR отсутствует.
- [Полный план](https://github.com/iliya1947/vico-forum/blob/51d0f4b906346141d19b4a55d68e247f1c01aea6/.github/agents/codex-6.1-sol.md#техплан-bounded-complaints-correction--mira-complaints-0102); [handoff Мире #6615160621](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6615160621).

## Подтверждённые defects и prepared technical delta

1. **MIRA-COMPLAINTS-01:** resolved History, participant initial/Appeal Result и shared NotificationsView используют host-default timezone при locale-sensitive formatting. SSR/hydration могут получить разный time text. План: explicit timeZone UTC в существующих calls; это текущий project default resolver/Queue, без новой policy/preferences.
2. **MIRA-COMPLAINTS-02:** PostgreSQL уже ограничивает History excerpt через left(...,500), а повторный JS slice(0,500) режет non-BMP по UTF-16 units. План: убрать только presentation slice, сохранить SQL bound и inert React text.

Регрессии: SSR→hydration при различающихся host TZ с одинаковыми serialized data/I18n; affected time nodes в History/Result/inbox, EN/RU/HE; native PostgreSQL и render fixtures500 emoji/499 BMP+emoji+tail. Новый тест должен выявлять baseline failure, а не только helper/options.

## Границы correction package

Один локальный package: три presentation sites + targeted tests. Schema/domain/permissions, SQL bound/DTO, DB timestamps/ISO/dateTime, replay/quota/Appeal/fanout/privacy и unrelated UI остаются текущими. Shared inbox использует один deterministic formatter для всех kinds; новые timezone branches по notification kind не вводятся.

Новые framework/dependency/migration/CI pipeline, production/external rollout не нужны. Existing locale и500-character contracts уже верны. Tests/implementation на planning этапе не запускались; acceptance пока не заявляется.

## Назначения и следующий шаг

- Мира — ChatGPT-5.6 Sol: проверить/принять техплан и назначить Лире один bounded implementation PR.
- Лира — ChatGPT-6: исполнитель после принятого плана/assignment.
- Лёва — Codex-6.1 Sol: technical planning завершён, implementation не меняет.
- Марк — Codex-6 Sol: без назначения.
- После реализации — stable exact-head checks → coordinator whole-PR review → independent technical review того же head.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
