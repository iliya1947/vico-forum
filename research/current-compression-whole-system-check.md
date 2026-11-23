# Whole-system check — current-based compression drafts

Scope: новые compression/fix drafts, построенные только из действующих User / Project / AGENTS baseline без добавления новых требований.

## 1. Объём

| Layer | Current chars | Draft chars | Current words | Draft words | Numbered rules |
|---|---:|---:|---:|---:|---:|
| User | 1302 | 1190 | 185 | 167 | 15 → 15 |
| Project | 3341 | 2737 | 443 | 375 | 18 → 18 |
| AGENTS | 17720 | 16082 | 2209 | 2015 | 64 → 64 |
| **Total** | **22363** | **20009** | **2837** | **2557** | **97 → 97** |

Итого:
- сокращение: **2354 chars (10.53%)**;
- сокращение: **280 whitespace-words (9.87%)**;
- самостоятельные нумерованные требования: **97 → 97**;
- новых требований: **0**.

## 2. Semantic preservation

Отдельные per-layer checks:
- User: `research/user-current-compression-pass.md`;
- Project: `research/project-current-compression-pass.md`;
- AGENTS: `research/agents-current-compression-pass.md`.

Whole-system recheck подтверждает:
1. User сохраняет global scope, обязательность, factual/verification guards, самостоятельную диагностику, no-extra-steps, numbering и `...`.
2. Project сохраняет приоритет прямых инструкций пользователя, обязательное чтение актуального `main:AGENTS.md`, current-Stage/future-work boundary, весь Codex prompt contract, bounded decomposition/STOP и risk rules.
3. AGENTS сохраняет developer priority, роли, logic/diagnosis/fix scope, service/implementation PR workflow, review cycle, exact-head semantics, CI labels, documentation boundaries и full-doc-audit contract.
4. В предварительном AGENTS wording-pass обнаруженные semantic regressions были отклонены до записи финального draft; чувствительные области перепроверены отдельно.

Вердикт: **подтверждённых semantic regressions в текущих трёх drafts не найдено**.

## 3. Межслойные пересечения

### User ↔ Project

1. User обязателен глобально; Project прямо сохраняет совместное действие User + Project.
2. Project прямо сохраняет приоритет прямых инструкций пользователя текущего чата.
3. User `...` означает явную команду продолжить; Project bounded STOP требует явной команды для следующей подзадачи. Эти правила совместимы: `...` является такой командой.
4. User запрещает ненужные следующие шаги; project/AGENTS-specific обязательные продолжения не являются «ненужными», когда их требует действующий регламент.

### Project ↔ AGENTS

1. Project требует читать актуальный `main:AGENTS.md`; AGENTS остаётся shared repository contract.
2. Project current-Stage/future-groundwork rule совместим с AGENTS Review finding classification и не расширяет его.
3. Project Codex prompt contract не меняет роли или authority из AGENTS.
4. Project decomposition/STOP управляет работой ChatGPT с пользователем; AGENTS workflow управляет агентным delivery/review. Нового противоречия не возникло.
5. Mapping имён Project совпадает с AGENTS Roles.

### User ↔ AGENTS

1. User factual/verification guards и AGENTS logic/diagnosis направлены в одну сторону; противоречащих модальностей не найдено.
2. User «однозначную задачу выполняй без лишних вопросов» не отменяет AGENTS permissions/gates: действие выполняется только в применимых границах.
3. AGENTS обязательный блок `Действие разработчика` совместим с User запретом ненужных шагов: внутри проекта блок является обязательным регламентом.

Вердикт: **новых межслойных конфликтов — 0**.

## 4. Что эта проверка НЕ утверждает

1. Она не доказывает, что существующая архитектура правил оптимальна.
2. Она не добавляет новые интеллектуально-логические улучшения.
3. Она не исправляет возможные плохие policy-решения, уже присутствующие в current baseline.
4. Она подтверждает только текущую задачу 1: existing rules стали короче без обнаруженной потери действующего смысла или новых конфликтов.

## 5. Итог задачи 1

Три current-based drafts готовы как консервативный compression/fix result:
- User: `c0163c75b4ba43324cf5077582c63a5740c0c91e`;
- Project: `a8edf0bde52a65c113fdcc6215b49b01b7dcbdaa`;
- AGENTS: `abeec361dd0e52434a0fc04ddb44435bf7ff6466`.

Реальные User/Project Instructions и `main:AGENTS.md` не изменялись.
