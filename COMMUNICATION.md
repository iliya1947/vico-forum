# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## K5 correction

1. Final assembled PR #388 остаётся open/unmerged; main unchanged.
2. K5-CORRECTION exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601` отличается от accepted baseline только test/evidence файлом `tests/browser/sa04-attachments/check.py`.
3. Product/runtime/schema/workflow не изменены.
4. Targeted K5 проведён через temporary diagnostic PR #396, чтобы path-filter запустил только K5 acceptance на том же head. #396 закрыт без merge после evidence capture.
5. Run #45922622929 / job #140256622743 — SUCCESS; merge-ref tree идентичен head tree; 33/33 cases; external/page errors отсутствуют; six readiness checks PASS.
6. Artifact #15165481754 подтверждает exact SHA и полный results.json.
7. Успешный run подтверждает correction и K5 matrix, но не воспроизводит точное старое failing value: readiness snapshots уже содержали UUID. Поэтому прежний runtime-момент не переопределён постфактум.
8. Full final CI/acceptance assembled #388 после correction ещё не выполнялись.

## Следующий route

Отдельно запустить один final `run:ci` + `run:acceptance` на #388 exact `71cdb70d...`, проверить actual execution и только после полного PASS переходить к final whole-feature coordinator review.

Лёва и Ада не independent final reviewer из-за участия в implementation. AUTH-07 и Stage-6 заблокированы.
