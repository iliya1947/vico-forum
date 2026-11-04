# Admin panel — current workflow

- Служебный PR: #251
- План: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-07 — correction author handoff, targeted actual browser re-test pending
- Статус: два confirmed current-scope defects AP07-ACC-01/02 локально исправлены в одном commit; exact-head CI SUCCESS; actual Worker/browser re-test пока НЕ выполнялся на исправленном head
- Base/main: `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`
- Implementation PR: #282 (draft, mergeable)
- Defective old head: `b0d5e74663cd57851225447e792ab4a9bf98322c`
- Corrected stable exact head: `985160867001fd42b3ad2614262927aab3edfb3e`
- Corrected exact-head CI #41755521661: SUCCESS (`checks`, `database`)
- AP07-ACC-01/P2: `app/routes/topic.tsx` propagates action/error Cache-Control + Retry-After through route headers(), retains public GET/parent headers/cookies
- AP07-ACC-02/P2: `.admin-topic` only wrap/min-inline-size CSS for long valid names; public layout untouched
- Исполнитель correction: Лира — completed, author handoff
- Следующий шаг: Лёва выполняет **targeted actual browser re-test** двух исправлений на `985160867001fd42b3ad2614262927aab3edfb3e` в своём isolated built-Worker/BetterAuth/disposable-PG environment без пользовательского браузера. После evidence Мира проводит новый coordinator-first whole-PR verdict; independent technical review — только после coordinator PASS
- Owner visual acceptance не запрашивался; AP-08+/merge/production rollout не начинать
