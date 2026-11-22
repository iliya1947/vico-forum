# AGENTS wording reduction — финальный semantic diff

Сравниваются:
- structural-dedup `AGENTS.draft.md` @ `69e4640e0f98e77d67ce5cabc2fbedcbd410a5a3`;
- текущий `AGENTS.draft.md`.

## 1. Итог wording pass

1. Numbered rules: 58 → 58.
2. Изначально изменялись 19 пунктов.
3. После финальной consistency-проверки:
   - 16 сокращений оставлены;
   - 3 формулировки локально исправлены для восстановления current semantics.
4. Остальные 39 numbered rules не затрагивались wording pass.

## 2. Исправленные semantic regressions

1. `Принципы работы агентов / 4`
   - восстановлена модальность «не требуется» вместо запрета «не исследуй».

2. `Диагностика перед выбором решения / 1`
   - exemption снова ограничен только symptom/causal-chain для новой functionality/foundation work.

3. `Общие правила / 6`
   - history снова не является source of truth именно **для текущего поведения**, а не вообще.

Commit локального исправления: `475a1ecabf31d07a4d93dc1fb3b96575d799a1fd`.

## 3. Объём

1. До wording pass: 2179 whitespace words.
2. Финальный draft: 2017 whitespace words.
3. Экономия: 162 слова.
4. По отношению к `AGENTS.current.md`: 2209 → 2017 слов.
5. Numbered rules по отношению к current: 64 → 58.

## 4. Semantic status

После исправления трёх regressions:
- structural merges остаются валидными;
- 16 wording reductions не выявили semantic loss;
- три ранее ошибочных сокращения больше не присутствуют;
- authority, permission, Stage, exact-head, PR-routing и review gates сохранены.

**Вердикт: PASS.**
