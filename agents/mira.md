# Mira

Текущая задача: внедрить ручной агентский запуск PR-тестов.

Ключевой технический нюанс: GitHub-коннектор умеет применять/снимать labels, но не создавать repository labels. Поэтому implementation должен сам bootstrap-ить `run:ci` и `run:acceptance` после merge.
