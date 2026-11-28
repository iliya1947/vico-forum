# AGENT_ERRORS.md — подтверждённые ошибки агентов, полезные для этой задачи

## AE-01 — grep-first был выдан за системный audit path

Ранняя версия аудита начинала с маркеров `legacy` / `placeholder` / `future` / TODO и типов файлов. Это не обеспечивает completeness по продуктовым проекциям и было заменено capability-first методом.

Prevention: сначала строить карту current capabilities и проверять все projection classes, затем использовать grep только как инструмент поиска конкретных артефактов.

## AE-02 — exact-count был заявлен до достаточного fresh review

Промежуточные exact totals (включая 111 и 84) содержали false positives/неполноту; после независимой проверки итог baseline стал 80.

Prevention: exact total объявлять только после false-positive, duplicate и completeness review; изменение source/main требует пересмотра зависимых exact claims.
