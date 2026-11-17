# История проекта — 2026-11-16 — 2026-11-17: Super-admin SA-05–SA-08

Исторический snapshot завершённого repository/local-CI implementation/CI/review
цикла **SA-05 → SA-06 → SA-07 → SA-08**. Это **не** source of truth
текущего поведения. Текущее состояние — [PROJECT_STATE.md](../../PROJECT_STATE.md),
постоянный контракт — [SUPER_ADMIN.md](../SUPER_ADMIN.md);
рабочие назначения и review evidence — [service PR #331](https://github.com/iliya1947/vico-forum/pull/331).

## Фактическая последовательность merge

Все четыре implementation PR объединены в `main` после review. Время UTC
по GitHub, SHA — фактический merge commit.

| Пакет | PR, merged UTC | Основной доставленный результат | Merge commit |
| --- | --- | --- | --- |
| SA-05 | [#337](https://github.com/iliya1947/vico-forum/pull/337), 2026-11-16 17:04 | Canonical exact-Owner deactivation command/UI, атомарный AccountState/presence/event, lifecycle и сохранение контента/retained-данных; connected post-deactivation writer acceptance | `7e7a803876422c2f40faaf720b59027d468e99dc` |
| SA-06 | [#338](https://github.com/iliya1947/vico-forum/pull/338), 2026-11-17 12:09 | Four native Monitoring areas: Forum, Administration, Moderation, Notifications; original-source adjacent/global/person History и migration `0066_sa06_native_monitor_indexes` | `1e4bcf83ff7bda0ec772a8098671ca9afe63888a` |
| SA-07 | [#339](https://github.com/iliya1947/vico-forum/pull/339), 2026-11-17 14:02 | Five native operational areas: Background, Localization, Files, Data, Integrations; bounded recording, retained storage samples и source-aware History without live provider activation | `45406723c4b53ceba9392d3fb7dc84e8adaa9768` |
| SA-08 | [#340](https://github.com/iliya1947/vico-forum/pull/340), 2026-11-17 21:27 | Final 13-area Overview (12 measured + Infrastructure placeholder), global/scoped History filters, canonical action navigation and whole-program connected acceptance | `2ed977604ae0e6a3c0c2650112f65b42fc7eb77a` |

После #340 актуальный для этого snapshot `main` —
`2ed977604ae0e6a3c0c2650112f65b42fc7eb77a`.

## Сохранённые границы продукта

1. **SA-05** использует существующую SA-04 lifecycle schema, а не новый user
   deletion/backfill. Деактивация защищена exact server-bound Owner; self-target
   запрещён, принятие конкурирующих writers определяется реальным порядком commit.
   Опубликованные сообщения, ревизии, вложения и protected retained account
   данные остаются. Публичная identity нейтрализуется; reactivation/physical
   purge/forced foreign-session termination/foreign credentials не реализованы.
2. **SA-06** переиспользует существующие авторитетные Forum/Admin/Help/
   Complaint/notification факты. Десять новых native monitors и native
   chronological/attribution indexes `0066` не создают параллельный
   mutation backend или глобальный фальшивый аудит.
3. **SA-07** измеряет существующее состояние и сохраняет bounded original
   task/file/storage observations. Часть событий best-effort, а disabled/
   unwired провайдеры и недостаточная coverage обозначаются явно.
   Один retention sample не выдаётся за успешный live R2 вызов, GET не
   инициирует provider, Queue или storage probe.
4. **SA-08** сводит real источники в shared bounded snapshot и source-aware
   Event log. Раздельная неисправность не скрывает успешные соседние области
   и не превращается в зелёный ноль. Closed History filters сохраняют исходные
   `(origin,id)` и bound keyset; действия ведут на canonical Admin, Settings,
   Attention или unified profile. Infrastructure остаётся Stage-6 placeholder.

## Значимая коррекция и независимые проверки SA-08

- Последняя connected-correction **M1** касалась доказательства Owner admission
  при **отсутствующем или неверном server binding**. Финальная правка затронула
  только `tests/browser/sa08/binding-check.py` и `tests/browser/sa08/pg.mjs`,
  без изменения product code: реальный built Worker/Better Auth, canonical
  public/Admin profile и настоящий Owner deactivation GET/POST проверены на
  запрет до private reads и доменных эффектов.
- Полный implementation head, проверенный перед merge:
  `5eb6656d933eb39a5df45c1ddca85d3679d600c5`.
  [Мира, coordinator](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6957009585),
  [Лира, **новая** независимая проверка](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6960310054)
  и [Марк, независимая проверка](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6960406898)
  зафиксировали **PASS / 0 confirmed current-SA08 defects**.
  Ранее опубликованный PASS Лиры был отдельно
  [отозван как недействительный](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6959283581)
  из-за утраты контекста; он **не** использовался вместо повторной проверки.
- [CI на финальном head](https://github.com/iliya1947/vico-forum/actions/runs/44141047271):
  **2569/2569** application tests (208 файлов), **1410/1410** native
  PostgreSQL 17 tests (104 файла), типизация/lint/build, migrated schema
  manifest/runtime privilege/split-authority probes — SUCCESS.
  Дополнительно все **14** relevant workflows / **18** latest jobs — SUCCESS,
  в том числе [SA-08 connected](https://github.com/iliya1947/vico-forum/actions/runs/44141047036)
  с 20 main scenarios и 6 corrected missing/wrong binding chains.
  GitHub Actions checkout использовал синтетический PR merge
  `2576ad4de1de6f0a1537c93e1c51366000df018d`; сравнение с
  `5eb6656...` показало **0 изменённых файлов** при другом commit SHA.
- Известная unchanged `drizzle-kit generate` BigInt/exit-0
  false-green не является доказательством schema parity;
  её заменяли фактические schema manifest и runtime-role probes.
  Это не было подтверждённым дефектом SA-08.

## Не выполнено этим циклом

Implementation/review/CI охватывали **repository/local-CI** с disposable
PostgreSQL 17, real built Worker и Better Auth sessions, Chromium и
test-local R2/provider fixtures там, где нужны внешние seams.
Завершение SA-05–SA-08 **не** выполняло production deployment,
применение pending migrations в live DB, real Google OAuth/Owner binding,
Cloudflare/Neon/R2/Queue/provider acceptance, отдельный Owner Worker/Access
или Infrastructure monitoring. Они остаются Stage 6.

По [прямой коррекции разработчика](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6960538005)
Owner visual/UI acceptance перенесена в **отдельный поздний UI/UX pass**:
она **не** была pre-merge gate для #340. Этот исторический snapshot
не утверждает визуальную приёмку или готовность публичного релиза.
