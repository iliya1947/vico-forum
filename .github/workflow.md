# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-10 — AP10-PLAN-MIRA-05..06 исправлены, повторный coordinator review
- Current main / planning baseline: `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`
- AP-09 полностью merged: implementation #287, test stabilization #289, docs #288
- Technical planner/reviewer: Лёва; coordinator: Мира; implementation после approval: Лира
- Исходный план: [#6667784146](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6667784146)
- Локальная revision AP10-PLAN-MIRA-01..04: [#6670064497](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6670064497); актуальный полный план — `.github/agents/codex-6.1-sol.md`
- Coordinator review: AP10-PLAN-MIRA-01..04 закрыты revision; AP10-PLAN-MIRA-05 подтверждён owner; AP10-PLAN-MIRA-06 уточнён owner: block-management initial grants отсутствуют у всех built-in roles
- Owner decisions #6669655343/#6669734702 применены: разные нарушения → разные меры; до 3 последовательных appeals, одна pending на меру; accepted appeal → lift или change той же меры; admin identity internal-only
- Прежняя product-развилка §9 закрыта; новых owner вопросов нет
- Implementation AP-10 не начат; implementation PR/head отсутствует; code/DB/production не менялись
- Следующий шаг: Мира проверяет только [delta AP10-PLAN-MIRA-05..06](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6670909257); после approval назначает Лиру
- Last-manager принцип НЕ применяется к AP-10. Существующий код пока не менять; комплексная очистка после админ-панели отдельной задачей
- AP-11/Settings/Stage 6/production не начинались; Марк не назначен

- Block-management capabilities have no initial grants for any built-in role; authority is explicit-grant-only through existing dynamic authorization.

- Актуальный полный план — `.github/agents/codex-6.1-sol.md`; expired/lifted terminal, обе capabilities explicit-grant-only. Implementation до approval не начинать.
