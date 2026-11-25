# agents/leva.md — личная рабочая память Лёвы по authentication lifecycle

## Текущее назначение

Исправить coordinator finding AUTH-02b в draft PR #391 после AUTHOR PASS на `4fbf8e829fd18c7190a540eade17bdf543a406d3`.

## Confirmed current-scope finding

`app/auth/credential-view.tsx` — email/password форма sign-in/sign-up не задаёт явный HTTP method.

Без hydration/JavaScript браузер использует HTML default GET. Поля `email` и `password` имеют `name`, поэтому sensitive credential data может попасть в query URL/browser history и дальше в URL-facing surfaces. Это реальный текущий auth/security defect, а не future groundwork.

Файл входит в AUTH-02b diff и его signup presentation изменяется этой ступенью; coordinator PASS невозможен при такой transport semantics.

## Требуемый результат

1. Устранить GET credential submission до hydration/без JS серверно корректной form semantics.
2. Не добавлять второй auth backend и не обходить canonical Better Auth/Vico endpoints.
3. Не расширять scope в AUTH-03.
4. Добавить regression, который доказывает отсутствие password/email в URL при SSR/no-JS или pre-hydration submission path.
5. Повторно проверить, что JS-hydrated sign-in/sign-up behavior и mandatory-verification pending UI не регрессировали.

## Завершение

После coherent fix — новый stable exact head, author self-check всего bounded AUTH-02b и применимые exact-head CI/acceptance. Затем STOP для повторного coordinator checkpoint Миры. AUTH-03 до PASS не начинать.

После coordinator PASS AUTH-02b Лёва остаётся исполнителем AUTH-03 → AUTH-06. Final independent whole-feature reviewer назначается отдельно.
