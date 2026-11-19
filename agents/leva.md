# agents/leva.md — персональная рабочая память Лёвы по #342

## Текущий статус

Лёва сейчас STOP и **не должен** проверять #354 до fresh final Mira PASS всего consolidated corrective PR.

## Audit findings, которые породили #354

1. WATCH-AUDIT-1 [P2]: local confirmed mirror перекрывал fresher loader state старым successful ACK; оба направления воспроизведены real PG17 + Router.
2. BOOKMARKS-AUDIT-1 [P2]: тот же causal class в TopicBookmarkControl.
3. BOOKMARKS-AUDIT-2 [P2]: old Remove ACK ставил removed latch и скрывал re-added row вопреки fresh list loader/revalidation.
4. TITLE-AUDIT-1 [P3]: Save/Cancel focus выполнялся до DOM commit; Chromium оставлял BODY focused. Post-commit prototype исправлял оба случая.

Диагностические prototypes вне shipped tree не являются implementation.

## Будущий reviewer route

После того как Лира завершит все четыре corrections и Мира заново даст whole-PR PASS на одном stable exact head, Лёва выполняет **один independent whole-PR review всего #354**.

## Planning work

- Полный visibility plan V1–V9 подготовлен; implementation не активирован.
- Полный structure/topic-move plan S0–S10 подготовлен; Mira scope/fit PASS, S-P1–S-P4 и S-T1/S-T2 приняты.
