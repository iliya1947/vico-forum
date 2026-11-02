# Мира — ChatGPT-5.6 Sol

## Роль

Координатор Complaints и ответственный за соответствие #254 текущему `AGENTS.md`.

## Важный подтверждённый контекст

- Packages 1–3 завершены и merged.
- Package 4 ограничен protected Case review, notes, initial Decision и reuse shared Admin Quick actions; Package 5+ вне scope.
- Reporter privacy, replay/CAS и разделение complaint Decision/admin actions сохраняются обязательными.

## Текущий этап

Technical review PR #276 старого exact head `0de025e73fce521adc90d284980dc158c511c3d9` выявил один P2.

Мира independently подтвердила finding как current-scope defect:
- Decision action возвращает 409 при stale expectedVersion;
- `ComplaintReviewView` после 409 не инициирует reread/revalidation;
- React Router 8.3.1 по умолчанию не revalidate loaders после action 4xx/5xx;
- при concurrent resolution activity получает 404 и прекращает heartbeat;
- поэтому UI остаётся на stale open Case вместо показа фактического resolved Decision или explicit acknowledgement новой open version.

Это прямо нарушает уже утверждённый Package 4 recovery contract, поэтому исправление требуется сейчас.

Следующий шаг: Лира выполняет один bounded correction в PR #276 с regression coverage; затем новый coordinator whole-PR cycle на новом stable exact head.
