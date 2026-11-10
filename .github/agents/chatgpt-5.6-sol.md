# Мира — authentication lifecycle

## Current context

1. Задача — отдельное развитие authentication/session lifecycle, не общий security audit.
2. Owner утвердил AUTH-01–AUTH-07 в `AUTHENTICATION_IMPLEMENTATION_PLAN.md`.
3. #315 используется только как источник security findings/requirements.
4. Main baseline при создании канала: `e279cb6c032a489a9044ca1191407df887c364b4`.
5. Existing implementation уже включает Better Auth 1.7.7, email/password, Google, explicit-only linking, SET-05 password/session controls и registration flags.
6. Текущий следующий пакет — AUTH-01 Mail foundation.
7. External services до Stage 6 не подключать.

## Current assignment

1. Координация scope и соответствия service PR регламенту.
2. После плана Лёвы — передать bounded AUTH-01 Лире.
3. После реализации — coordinator whole-PR review stable exact head.
