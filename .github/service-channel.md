# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–5 **merged в main**.
- Current main: `284bee3f5f0899cce1dc751cf4e9ef169739a120`.
- Package 5 PR #277 merged; coordinator и independent technical review завершены PASS.
- Package 6 product scope утверждён; technical plan Лёвы проверен Мирой и принят для реализации.

## Package 6 — утверждённый product scope

Foundation уже существует: Appeal persistence, ordinal 1..3, participant-direction check первой Appeal, replay/events, `forum.complaint.appeal.review`, resolve `upheld | overturned`, readonly History.

Утверждённая политика:

1. Одновременно допускается только одна pending Appeal на конкретный initial Decision.
2. Eligibility следующей Appeal определяется текущим итогом:
   - confirmed → author-side;
   - not-confirmed → reporter-side;
   - upheld сохраняет итог и право той же проигравшей стороны;
   - overturned меняет итог и переводит право другой стороне.
3. Общий лимит — три Appeal на initial Decision. Когда eligible reporter-side, любой реальный reporter может занять следующий слот; один reporter может использовать следующий слот повторно, если его сторона всё ещё eligible.
4. После каждого Appeal result уведомление через общий inbox получают affected author + все реальные reporters, с дедупликацией recipient.
5. Original Decision immutable. Effective outcome выводится из initial Decision и последовательности resolved Appeals.
6. Предпочтителен reviewer, отличный от автора initial Decision, но это не блокирующее правило.

## Package 6 — технический план

[Полный план Лёвы](https://github.com/iliya1947/vico-forum/blob/84d456bcde0f14e28574c9e4c64cfb01accda810/.github/agents/codex-6.1-sol.md#технический-план-package-6--appeals).

Мира перепроверила план против утверждённой policy и current main. Конфликтов текущего scope не найдено. Ключевые предпосылки подтверждены в main: existing Appeal commands/replay/Case lock, отсутствие unique-pending/effective-outcome, текущая complaint-decision notification shape, отсутствие appeal.review admission в Attention и неактивный participant Appeal UI.

Техплан принят для одного bounded implementation PR. Package 7+, unrelated Admin/Signals/Security и production rollout вне scope. Owner visual acceptance не добавляется без отдельного запроса; применимые local/browser/runtime checks выполняются по фактической необходимости текущего Package 6.

## Назначения

- Мира — ChatGPT-5.6 Sol: coordinator scope + tech-plan check завершены; **следующий шаг — whole-PR review PR #279**.
- Лёва — Codex-6.1 Sol: technical plan завершён; следующий technical review только после coordinator PASS stable implementation head.
- Лира — ChatGPT-6: **Package 6 author handoff complete**; PR #279 exact head `9034409524fd0e9df85102680f68ded759705132`, CI #41546869959 SUCCESS. Scoped source/test inspection complete; independent whole-PR/runtime browser acceptance not claimed.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
