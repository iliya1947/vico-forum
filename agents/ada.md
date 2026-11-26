# agents/ada.md — личная рабочая память Ады по authentication lifecycle

## Активное назначение

**AUTH-05 correction F01 — registration-challenge email enumeration.**

Владелец назначил Аду заменой Лёве для дальнейшей работы. Whole-feature coordinator review Миры на AUTH-06 #395 exact `2eb3f9c303ad1b67d5348664267eca665f079cf7` дал HOLD с одним blocker.

## F01

В прежнем AUTH-05 #394 exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0` email signup при required challenge предварительно проверяет existence и выполняет challenge только для fresh email. Поэтому при открытой SET-02 email registration один и тот же missing/rejected/unavailable challenge может дать:
- existing email → native duplicate-neutral 200;
- fresh email → challenge 403/503.

Это caller-observable account enumeration и противоречит AUTH-05 no-enumeration contract. Полный evidence: `stages/AUTH-06/REVIEW.md`.

## Correction boundary

1. Работать в AUTH-05 implementation PR #394 / branch `feat/auth-05-anti-abuse`; base AUTH-04 не менять.
2. Исправить F01 без расширения scope и без выбора/активации внешнего challenge provider.
3. При открытой email registration challenge admission не должен раскрывать existing vs fresh email через challenge-dependent public behavior.
4. Сохранить neutral duplicate semantics, отсутствие user/account/session/mail mutation при denied fresh creation, server-owned budgets и provider-neutral boundary.
5. Не менять утверждённый permanent SET-02 deliberate closure contract из `docs/SETTINGS.md`.
6. Добавить differential regression: existing vs fresh email при missing/rejected/unavailable challenge; не ограничиваться отдельными кейсами.
7. После author self-check и применимых focused checks записать новый stable exact head/evidence в AUTH-05 RESULT и STOP для coordinator checkpoint Миры.
8. AUTH-06 #395 самостоятельно не синхронизировать до PASS corrected AUTH-05.
9. Поскольку Ада участвует в correction implementation, independent final whole-feature review этой сборки ей больше не назначается.

## Текущая точка продолжения

F01 correction candidate `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` опубликован в #394, base AUTH-04 неизменён. CI #45882443114 и acceptance (AUTH-05 #45882448007) запущены; результат пока не подтверждён. Повторный вход: актуальные AGENTS.md из main → RULES.md → TASK.md → WORKFLOW.md → этот файл; перед изменениями читать актуальный project/source-of-truth контекст, не повторять E-11. Продолжить с содержательной bounded author self-check по полному применимому контракту, не ожидая CI. По прямой поправке владельца результат author self-check не зависит от результатов CI/acceptance. Автоматизированные exact-head checks учитывать отдельно и не запускать повторно без причины. Передача Мире требует обоих положительных результатов. Детали в stages/AUTH-05/RESULT.md. Авторская проверка ещё не завершена.
