# Сравнение верхних слоёв и общего instruction load

Статус: proposal only. Действующие User instructions, Project instructions и `AGENTS.md` не изменены.

## 1. User instructions

| Метрика | Current | Proposed | Изменение |
|---|---:|---:|---:|
| Символы | 1913 | 2059 | 146 (7.6%) |
| Whitespace words | 262 | 268 | 6 (2.3%) |
| Строки | 31 | 33 | 2 (6.5%) |
| Нумерованные пункты | 15 | 16 | +1 |

User layer слегка увеличивается, но:
- удалены прямые дубли прежних U08/U13;
- перегруженные прежние U07/U09 переразложены;
- добавлены пять действительно отсутствовавших универсальных смыслов: evidence/applicability, modality, permission boundary, decision authority, stop condition;
- `...` больше не является неявным blanket permission.

## 2. Project instructions

| Метрика | Current | Proposed | Изменение |
|---|---:|---:|---:|
| Символы | 3340 | 3018 | -322 (-9.6%) |
| Whitespace words | 443 | 394 | -49 (-11.1%) |
| Строки | 65 | 61 | -4 (-6.2%) |

Из project layer удалены только два universal reasoning-повтора:
- «Всегда рассуждай от цели…»;
- «Всегда перед ответом… не отвечай по первой трактовке…».

Они теперь принадлежат User layer и не имеют отдельной Vico-specific семантики.

Остальные P01–P18 сохранены.

## 3. AGENTS.md

| Метрика | Current | Proposed draft | Изменение |
|---|---:|---:|---:|
| Символы | 17720 | 17228 | -492 (-2.8%) |
| Whitespace words | 2209 | 2143 | -66 (-3%) |
| Строки | 160 | 161 | 1 (0.6%) |

AGENTS proposal сохраняет Codex/shared-agent reasoning coverage и чистит внутренние operational дубли.

## 4. Все три слоя вместе

| Метрика | Current total | Proposed total | Изменение |
|---|---:|---:|---:|
| Символы | 22973 | 22305 | -668 (-2.9%) |
| Whitespace words | 2914 | 2805 | -109 (-3.7%) |
| Строки | 256 | 255 | -1 (-0.4%) |

Главный результат: общий instruction load уменьшается, хотя User layer становится немного длиннее.

Это нормальный результат архитектурной чистки:
- универсальные защиты живут в User;
- Vico orchestration — в Project;
- shared ChatGPT/Codex repository workflow — в AGENTS;
- дубли удаляются только там, где аудитория и область действительно совпадают.

## 5. Что осталось нерешённым

1. Гранулярность нового PR permission gate в AGENTS: permission на каждый PR или на задачу/цепочку.
2. Перед применением proposal User instructions нужно проверить не на новые стресс-тесты, а на **semantic coverage table**: каждый старый обязательный смысл и каждый подтверждённый новый guard должен иметь ровно одно понятное место.
3. Project proposal уже фактически минимален: там предлагается только удалить два universal duplicate paragraph.

## 6. Следующий bounded шаг

Составить semantic coverage table для User proposal:
- old U01–U15;
- new confirmed guards;
- exact target point;
- lost / preserved / strengthened;
- overlap count.

После этого можно будет судить, готов ли User proposal к показу разработчику как финальный кандидат.
