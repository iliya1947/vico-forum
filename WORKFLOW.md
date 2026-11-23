# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — forum structure/topic move: planning gate PASS; stacked delivery выбран; F1 назначен Лёве.**

- Проверенный current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Task 5 полностью закрыта: #355 implementation и #378 docs merged.
- Канонический технический план Task 6: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), S0–S10 / F1–F7.
- S-P1–S-P4 и S-T1/S-T2 остаются принятыми; продуктовый scope не переоткрывается.
- Implementation/schema/feature CI/deployment Task 6 на момент planning review ещё не начинались.

## Mira planning review — PASS

Мира независимо сверила reconciliation Лёвы с актуальным main и постоянными PROJECT / PROJECT_STATE / AUTHORIZATION / ADMIN_PANEL contracts.

1. **S2.1 hidden-topic boundary — fit PASS.**
   - `ForumReader.readTopicPage()` по-прежнему исключает hidden topic.
   - ordinary Admin topic использует public-safe reader; hidden source туда не добавляется.
   - существующие visibility queue/inspector уже подтверждают корректный архитектурный паттерн отдельного private capability-gated reader.
   - proposed `TopicMoveContextReader` остаётся source-free и не требует includeHidden/raw switch в public/ordinary Admin reader.

2. **S4.1 move × Hide/Restore — fit PASS.**
   - текущий `setTopicVisibility` берёт topic NO KEY UPDATE → actor/admission → History;
   - `setPostVisibility` берёт topic → post → actor/admission → History;
   - visibility writers не берут structure mutex;
   - planned move order structure → topic → containers → actor → History не образует обратного structure-lock edge.
   - visibility/location versions остаются независимыми; реальное доказательство обоих committed orders остаётся acceptance обязанностью F3/F6.

3. **S7.1 private route/UI seams — fit PASS.**
   - существующий `AdministrativeRouting.admin` — typed outgoing-address seam и может быть узко расширен новыми move/destination helpers;
   - current route table уже имеет отдельные private Admin Forum resources; новые move-context/destinations routes не требуют изменения public route contract;
   - existing visibility inspector может дать guarded Move entry без раскрытия topic source.

4. **F1→F7 dependencies — fit PASS.**
   - подтверждённого planning defect, нового product fork или current-stage blocker не найдено.

## Delivery mode — STACKED F1–F6

Task 6 поставляется одной stacked vertical feature:

1. F1 Draft implementation PR создаётся от актуального `main`.
2. F2 строится поверх head F1; далее F3 → F4 → F5 → F6.
3. После каждого F1–F5 author self-check + применимых checks Мира выполняет coordinator checkpoint; промежуточный PR не merge в `main`.
4. После F6 итоговый head собирается в первый PR; intermediate PR закрываются как superseded.
5. Final assembled exact head: author self-check → whole-feature review Миры → независимый whole-feature Codex-review → owner merge.
6. F7 — отдельный docs PR только после фактического implementation merge.

Почему независимый merge F1 запрещён: F1 добавляет `forum.structure.manage` / `forum.topic.move` в permission catalog и initial grants до появления соответствующих реальных operations. Текущий AUTHORIZATION contract определяет catalog как code-backed capabilities, поэтому такой промежуточный state не должен попадать в `main`. Stack сохраняет F1 bounded diff без публикации неполной capability.

## Следующая работа — Лёва: F1

Лёве назначен **только F1 — schema/catalog/runtime foundation** из S8 PLAN.

Результат F1:
- forward migration от актуального main (кандидат 0072 только если ceiling не сдвинулся);
- category/section ordering, structure singleton/version и topic location version;
- catalog/initial grants и Forum/AP-10/raw-authority wiring для двух новых permission keys;
- typed structural History action/target schema foundation;
- точный web runtime ACL/privilege contract;
- fixture/setup alignment, без подключения новых live user writes.

Готовность — ровно F1 Done из PLAN: clean + upgrade PG17, legacy order/IDs/content preserved, bigint/version invariants, Help untouched, schema/journal/snapshot/manifest/history parity, exact positive/negative web-role probes и применимые unit/type/build checks.

**Граница:** F2 authoritative structure commands, F3 topic move, private readers/routes/UI и дальнейшая feature не начинаются. После F1 author self-check + применимых exact-head checks Лёва STOP и передаёт stable head Мире для stacked coordinator checkpoint.

Если `main` сдвинется до первого F1 commit, перепроверить только затронутые current-main seams и migration ceiling; полный S0–S10 заново не проектировать.

## Reviewer route

Owner ранее разрешил использовать Лёву в реализации. Поскольку Лёва теперь участвует в implementation, он не может быть независимым reviewer финально собранной feature.

**Final independent Codex reviewer: Марк (Codex-6 Sol)**, если до final gate он не участвует в коде Task 6. Промежуточные stacked F1–F5 проходят только Mira coordinator checkpoint по AGENTS.md.

## Границы

- #342 — единственный service channel этой задачи и никогда не merge.
- #300, Stage 6, deploy и general UI/UX не активированы.
- После F7/docs closeout — установленный переход к #320.
