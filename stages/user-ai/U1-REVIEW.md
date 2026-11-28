Этот файл фиксирует coordinator checkpoint bounded-этапа U1 самостоятельной задачи User AI / Vico Consultant.

# User AI U1 — coordinator checkpoint

Дата: 28.11.2026.

## Проверяемый head

Implementation PR: `#403`  
Branch: `feature/user-ai-u1`  
Base: `main` `99b40480cb4d777298aafb1ffae7f28cf0c6085d`  
Stable exact head: `f17bd79edb3c2b35aee47ac5669513dbd404bfda`

## Итог

**HOLD.**

Source review всего U1 diff выполнен против принятого `stages/user-ai/PLAN.md`. Подтверждён один дефект текущей задачи.

### U1-F01 — lint failure в новом U1 test

Основной CI run `46175857633` на exact head `f17bd79edb3c2b35aee47ac5669513dbd404bfda` дошёл до `pnpm lint` и завершил job `checks` с failure.

Подтверждённая причина:

- `app/consultant/consultant.test.ts:291:58`;
- ESLint rule `no-regex-spaces`;
- сообщение: `Spaces are hard to count. Use {4}`;
- offending regex содержит четыре буквальных пробела перед `route\(`.

Это изменение входит в U1 diff, поэтому finding относится к текущей реализации и блокирует coordinator PASS. Typecheck/test/build в этом CI job после lint не выполнялись.

Исправление должно быть локальным: заменить неоднозначную последовательность пробелов в regex на эквивалентный явный quantifier без изменения поведения теста или production-кода.

## Source review

Проверены все 17 изменённых файлов U1 и критические canonical boundaries из принятого основания.

Подтверждено:

1. Scope ограничен U1: protected navigation API, session/AccountState admission, effective-permission disclosure, server-only navigation catalog, canonical localized links и детерминированная навигация.
2. LLM/provider, semantic retrieval/index, migrations, production activation и U2+ в diff не добавлены.
3. Actor берётся из текущей Better Auth session; после bounded body выполняется повторный live AccountState admission.
4. Disclosure строится из одного current effective permission snapshot; role names не являются authority; authorization unavailability закрывает protected output.
5. Exact Owner knowledge требует trusted Owner binding и owner authority source.
6. Denied/hidden/missing targets не раскрываются; topic/post contextual links rehydrate через canonical Forum reader.
7. Tests покрывают role/grant/override/deny, exact Owner, missing authorization state, current AccountState, hidden targets, locale routes и no-provider behavior.

Других подтверждённых блокирующих source findings на этом head не найдено.

## Checks

Business-Мира запустила `run:ci` и `run:acceptance`.

На момент фиксации HOLD уже успешно завершились применимые connected checks, включая SA04-L3 authorization, SA04-J12 AccountState, SA04-M2 AP10 AccountState, Topic Watch, Topic Bookmarks, Own topic title, SA05 Owner deactivation, SA04-S и AUTH-05. Часть path-triggered acceptance ещё выполнялась.

Оставшиеся результаты старого head не могут дать PASS после U1-F01: correction изменит exact head и по `AGENTS.md` потребует нового полного coordinator cycle. Любой дополнительный failure старого head при необходимости должен быть диагностирован до завершения correction cycle.

## Correction

Ада исправляет **только U1-F01** и выполняет source self-check нового diff. CI/acceptance Ада не запускает и не анализирует.

После передачи нового stable exact head Business-Мира заново запускает применимые checks и повторяет coordinator checkpoint всего U1.

U2 не активировать до PASS U1.
