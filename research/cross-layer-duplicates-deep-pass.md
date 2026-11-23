# Глубокий межслойный duplicate-pass после D1–D4

Проверены текущие exact drafts после применения D1–D4:
- User: `a6f16c64a68ebf372a4a6bb3ff146112463e7d68`;
- Project: `8cdf099aa3ecd0c1bbd295cbbba1353cca327995`;
- AGENTS: `abeec361dd0e52434a0fc04ddb44435bf7ff6466`.

Критерий delete-safe:
1. одинаковая аудитория;
2. одинаковый trigger/scope;
3. одинаковое требуемое действие/запрет;
4. удаление одного текста не уменьшает coverage ни в одном применимом контексте.

Если хотя бы один пункт отличается, это не delete-safe дубль.

## 1. User ↔ Project

### U1 ↔ P1 — обязательность User + Project

User 1 делает User Instructions обязательными всегда, включая проекты.

Project 1 дополнительно устанавливает совместное действие **User + Project** внутри проекта.

Разница:
- User не устанавливает обязательность Project layer;
- Project 1 явно задаёт совместное применение двух слоёв.

Вердикт: **не дубль**.

### U10 ↔ P14–P15 — выполнение без вопросов vs bounded STOP

User 10 требует выполнять однозначную задачу без лишних вопросов.

Project 14–15 задают decomposition и обязательный STOP после отдельной подзадачи до явной команды пользователя.

Это разные triggers:
- User 10 — отсутствие смысловой неопределённости;
- Project 15 — процессная граница длительной задачи.

Вердикт: **не дубль**.

### U11 ↔ P10–P11 — ненужные шаги vs ограничения в Codex prompt

User 11 запрещает ненужные инструкции/следующие шаги вообще.

Project 10–11 отдельно регулируют содержимое постановки Codex: дублирующие/страхующие ограничения и жёсткие требования.

Project rules уже являются специализацией по объекту и типу ошибки.

Вердикт: **не delete-safe**.

### U13 ↔ P12–P13 — ошибка прошлого ответа vs neutral Codex prompt

User 13 запрещает переносить ошибку предыдущего ответа ChatGPT как факт.

Project 12–13 запрещают навязывать Codex предварительный вывод и требуют нейтральный prompt для независимой проверки даже когда вывод ChatGPT не доказан ошибочным.

Coverage Project шире по bias/independence.

Вердикт: **не дубль**.

Итог User ↔ Project: **новых delete-safe дублей 0**.

## 2. Project ↔ AGENTS

### P2 ↔ AGENTS Workflow/General bootstrap

P2 требует ChatGPT получить именно актуальный `main` и **до работы полностью прочитать `AGENTS.md`**.

AGENTS не может надёжно заменить собственный bootstrap: его правила начинают действовать после получения файла.

Вердикт: **уникальный bootstrap, KEEP**.

### P3 ↔ AGENTS Review 5 + General 3/10

P3 применяется к **каждой проблеме, найденной ChatGPT в работе Codex**, до решения об исправлении.

AGENTS Review 5 классифицирует findings в контексте PR review; General 3/10 ограничивают future-Stage work, но не задают тот же обязательный classification trigger для любой работы Codex.

Разница trigger/scope остаётся.

Вердикт: **strong overlap, но не delete-safe**.

### P4 ↔ AGENTS permissions/gates

P4: если обязательное правило невозможно выполнить, не выполнять противоречащее действие и сообщить ограничение.

AGENTS содержит конкретные permissions/gates, но не общий fallback для невозможности исполнить обязательное правило.

Вердикт: **уникальное правило, KEEP**.

### P5–P11 ↔ AGENTS Roles / Workflow / handoff

P5–P11 регулируют **как ChatGPT формирует задачу для Codex**: result/scope/readiness, контекст, ссылки на файлы, свобода реализации, ограничения.

AGENTS регулирует роли Codex и delivery/handoff, но не содержит эквивалентного prompt-construction contract.

Вердикт: **не дубли**.

### P12–P13 ↔ AGENTS Principle 1 / Review independence

AGENTS требует независимого мышления и независимого reviewer.

P12–P13 регулируют поведение **отправителя prompt**: не seed'ить Codex выводом ChatGPT при research/independent check.

Даже независимый reviewer может получить biased prompt; AGENTS не запрещает sender-side priming.

Вердикт: **специализация, KEEP**.

### P14–P16 ↔ AGENTS bounded workflow

Project:
- декомпозировать длительную задачу;
- после каждой подзадачи сообщить результат и STOP до команды пользователя;
- не дробить единое целое.

AGENTS:
- описывает implementation bounded stages, stacked delivery и review cycle.

Разные scope:
- Project — разговорный/координационный цикл ChatGPT ↔ пользователь;
- AGENTS — repository delivery cycle команды.

Вердикт: **не дубли**.

### P17–P18 ↔ AGENTS General 3 / Scale fix

Project задаёт risk posture по lifecycle:
- до pre-release simplicity/speed/reversibility с исключением дорогой будущей переделки;
- с pre-release — реальные эксплуатационные риски и цена ошибки.

AGENTS ограничивает scope изменений и масштаб исправления, но не задаёт эквивалентную lifecycle risk policy.

Вердикт: **не дубль**.

### Project agent-name usage ↔ AGENTS Roles

D3 уже устранил data duplication: Project больше не повторяет mapping.

Оставшееся Project-требование **использовать** имена в обращении/идентификации отсутствует как отдельный contract в AGENTS.

Вердикт: **не дубль**.

Итог Project ↔ AGENTS после D1–D4: **новых delete-safe дублей 0**.

## 3. User ↔ AGENTS

Повторно проверены ранее найденные A1–A7 и дополнительные пары U10/U11/U12.

Все семантические пересечения остаются **audience-required**:
- User layer нужен ChatGPT во всех чатах;
- AGENTS layer нужен и ChatGPT, и Codex в репозитории;
- Codex не получает User Instructions как свой общий контракт.

Удаление generic logic из AGENTS уменьшит Codex coverage; удаление из User уменьшит global ChatGPT coverage.

Дополнительные пары:
- U10 ↔ AGENTS Developer action 2 — AGENTS правило содержит project workflow и handoff, не эквивалентно global U10;
- U11 ↔ AGENTS Developer action 1/2 — обязательный project continuation block не дублирует запрет ненужных инструкций;
- U12 ↔ AGENTS logic/diagnosis — User задаёт приоритет качества результата, AGENTS задаёт конкретный процесс; не эквивалентно.

Итог User ↔ AGENTS: **delete-safe дублей 0**.

## 4. Финальный результат глубокого прохода

После уже применённых D1–D4:

1. новых полных delete-safe межслойных дублей: **0**;
2. новых частичных delete-safe дублей: **0**;
3. остаётся один сильный semantic overlap P3 ↔ AGENTS, но удаление P3 пока сужает trigger/scope;
4. User ↔ AGENTS повторы необходимы из-за разной аудитории;
5. остальные Project ↔ AGENTS совпадения являются specialization/bootstrap/workflow distinctions, а не дублями.

## Вывод

Межслойный delete-safe резерв на текущих drafts **исчерпан** без изменения архитектуры или переноса ответственности между слоями.

Дальнейшее уменьшение существующих инструкций нужно искать уже:
- во **внутренних дублях внутри каждого слоя**, прежде всего AGENTS;
- либо через осознанное изменение архитектуры/coverage, что уже не является простой дедупликацией.
