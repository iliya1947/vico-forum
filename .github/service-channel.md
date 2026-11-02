# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–5 **merged в main**.
- Current main: `284bee3f5f0899cce1dc751cf4e9ef169739a120`.
- Package 5 PR #277 merged; coordinator и independent technical review завершены PASS.
- Permanent source-of-truth оставляет interactive Appeal workflow/UI, Appeal notifications и effective-outcome policy Package 6.

## Package 6 — утверждённый продуктовый scope

Foundation уже существует: Appeal persistence, ordinal 1..3, participant-direction check первой Appeal, replay/events, `forum.complaint.appeal.review`, resolve `upheld | overturned`, readonly History. Package 6 не строит домен заново.

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
6. Предпочтителен reviewer, отличный от автора initial Decision, но это не блокирующее правило при отсутствии альтернативы.

Package 6 должен подключить поверх foundation participant submission/result, реальную Complaints Appeals queue, reviewer workflow, effective-outcome/transition policy и Appeal result notifications. Signals/Security/Admin sanctions, production rollout и Package 7 вне scope.

## Назначения

- Мира — ChatGPT-5.6 Sol: Package 6 scope definition завершён.
- Лёва — Codex-6.1 Sol: **технический план Package 6**.
- Лира — ChatGPT-6: без implementation assignment до принятого техплана.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
