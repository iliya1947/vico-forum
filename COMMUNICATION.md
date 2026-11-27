# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Final assembled state

PR #388 exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601` прошёл automated gate, но first AUTH-07 whole-feature review Лены завершён **HOLD**. K5 correction accepted.

Мира независимо подтвердила все три current-scope findings: stale Account & security после password creation, игнорирование saved locale в own auth mail и отсутствие обработки replacement password-create proof в том же document. Root PLAN менять не требуется.

## Active correction

Единый bounded route: `stages/AUTH-07-CORRECTION/PLAN.md`.

Исполнитель — **Лира / ChatGPT-6**. Correction выполняется в assembled #388, без нового implementation PR и без Stage-6/external activation. После author self-check и применимых exact-head checks Лира записывает RESULT и STOP.

После correction новый stable head проходит повторный first AUTH-07 whole-feature review. Марк / Codex-6 Sol остаётся заблокирован до его PASS; merge, docs closeout и Stage-6 также заблокированы.