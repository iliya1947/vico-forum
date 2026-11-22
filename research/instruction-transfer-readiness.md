# Transfer readiness — current exact drafts

Проверены текущие exact drafts:

1. `USER_INSTRUCTIONS.draft.md`
   - blob: `ef1c0efd10d2e95a5481476d91b336884d7d9c61`
   - 35 numbered rules
   - 4999 characters
   - current coverage: 15/15 FULL
   - retained semantic guards: 52/52
   - executability stress: 17/17 EXEC PASS

2. `PROJECT_INSTRUCTIONS.draft.md`
   - blob: `fd8153931a306eb7e7c65a0e14db28dc20b437fe`
   - 16 numbered rules
   - 2713 characters
   - current Project baseline: 3341 characters

3. `AGENTS.draft.md`
   - blob: `170ef5ed10715e416a376c75c3dae188ae0a3d24`
   - 58 numbered rules
   - 16186 characters

Three-layer consistency этих exact blobs: PASS, blockers 0.

## 1. Global Custom Instructions

Актуальный OpenAI Help Center на 2026-11-22:
- Web/Desktop: `Settings → Personalization → Custom Instructions`;
- изменения Custom Instructions применяются сразу;
- Plus/Pro/Enterprise/Business/Education: лимит **5000 characters**.

Официальный источник:
- https://help.openai.com/en/articles/8096356-chatgpt-custom-instructions

Current User draft: **4999 characters**.

Дополнительно до transfer-readiness уже подтверждены:
- 15/15 действующих User rules;
- 52/52 retained guards;
- 17/17 structural executability stress PASS.

**Вердикт: READY.**

## 2. Project Instructions

Актуальный OpenAI Help Center:
- Project instructions добавляются через `Project → ••• → Project settings`;
- действуют внутри проекта;
- override global Custom Instructions внутри проекта.

Официальный источник:
- https://help.openai.com/en/articles/10169521-projects-in-chatgpt

Точный официальный character limit поля Project Instructions в найденной документации не указан.

Практическая вместимость:
- current active Project instruction snapshot: **3341 characters**;
- current draft: **2713 characters**.

Draft короче текущего активного instruction set на 628 characters.

Three-layer consistency для exact User + Project + AGENTS blobs: **PASS, conflicts 0**.

**Вердикт: READY.**

## 3. AGENTS.md

Актуальный repository state проверен:

- `main` head: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`;
- `main:AGENTS.md` blob: `9037fc15fd2b5fbf8c86ee677d00198dfcfbe442`;
- `AGENTS.current.md` в #368 имеет тот же blob;
- exact content equality: true.

Следовательно, AGENTS draft по-прежнему построен против актуального baseline; repository drift, требующий повторного анализа, не найден.

#368 остаётся аналитическим service PR и не предназначен для merge. Поэтому перенос `AGENTS.draft.md` выполняется отдельным обычным repository PR от актуального `main`.

**Вердикт: READY FOR SEPARATE REPO PR.**

## 4. Безопасный порядок переноса

### 1. User layer

Сначала заменить global Custom Instructions на текущий 35-rule User draft.

Причины:
- это финальный global baseline;
- Project draft уже рассчитан на отсутствие части generic дублей;
- OpenAI применяет Custom Instructions сразу.

### 2. AGENTS layer

Затем отдельным mergeable repository PR перенести `AGENTS.draft.md` в `main:AGENTS.md`.

Причины:
- Project draft bootstrap’ит актуальный `main:AGENTS.md`;
- name/model mapping и shared repository contract должны быть установлены до переключения Project layer.

### 3. Project layer

Последним заменить Project Instructions на текущий Project draft.

Причины:
- к этому моменту global User baseline и shared repository contract уже установлены;
- Project Instructions override global Custom Instructions внутри проекта;
- exact three-layer consistency подтверждает 0 конфликтов.

## 5. Итог

1. User transfer readiness — **PASS**.
2. Project transfer readiness — **PASS**.
3. AGENTS transfer readiness — **PASS**, через отдельный repository PR.
4. User character limit — **4999/5000 PASS**.
5. User semantic coverage — **52/52 PASS**.
6. User current coverage — **15/15 FULL**.
7. User executability — **17/17 EXEC PASS**.
8. Three-layer consistency — **PASS**, blockers 0.
9. Repository drift blocker для AGENTS — **0**.
10. Character/semantic/executability/consistency blockers — **0**.
11. Реальные instruction sources пока не изменены.

## Status

**TRANSFER READINESS PASS** для текущих exact blobs.

Следующий отдельный этап — подготовить фактический transfer package: точные финальные тексты, порядок замены и отдельную постановку для переноса `AGENTS.md` в `main`. Реальные sources без прямой команды разработчика не менять.
