# Мира — ChatGPT-5.6 Sol

Активная задача: поэтапный аудит AUD-20261022. Этап 5 начат; части 1–3 технически завершены, следующий шаг — completeness sweep.

Этот файл используется для собственных рабочих результатов, выводов и технического контекста Миры в рамках текущего служебного PR.

## AUD-20261022 — этапы 1–4

- Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.
- Этап 1: 18 актуальных документов / 7934 строки прочитаны полностью.
- Этап 2: architecture/config/dependency/server-client boundaries проверены.
- Этап 3: email/password/session, dynamic authorization и ownership boundaries проверены.
- Этап 4: public forum/discovery/participation/unread/notifications/profiles/presence/public Help modes завершён.
- Findings остаются только в current developer chat до завершения checking sequence.

## AUD-20261022 — этап 5, части 1–2

- Solved/best-answer, manual solution moderation, duplicate relationship/appeal stale/concurrent paths проверены.
- Ordinary Help signals проверены end-to-end; новых independent findings в signal foundation не установлено.

## AUD-20261022 — этап 5, часть 3 — standalone Attention

- Access/mode isolation, group visibility, current effective permission filtering, counts, group readers, authoritative review-status tasks, exact case identity и action stale/concurrency paths проверены.
- Signal actions stale-safe по exact case id; standalone appeal action stale-safe по exact appeal id / expectedAppealId.
- Mixed implementation выбирает qualifying topics до paging и затем разворачивает все visible pending signal cases этих topics; существующий connected test намеренно допускает >50 карточек на одной Mixed page.
- Это конфликтует с `docs/UI_UX_PASS.md`, где явно записано `Each group selects its own cases before paging` и описывается 50-case page. `PROJECT_STATE.md`, напротив, отдельно фиксирует Mixed topic paging.
- Владелец подтвердил, что такую семантику сам не утверждал, и отметил, что 50 элементов по умолчанию слишком много. Поэтому вопрос классифицирован как unresolved current contract/problem, но не как blocker дальнейшего аудита и не как самостоятельно выбранный implementation fix.
- В финальном audit report нужно вывести этот пункт вместе с остальными problems и отдельно оставить product decision: case-vs-topic pagination и меньший default page size.
- Следующий шаг: stage 5 part 4 completeness sweep and stage closure.
