# Decisions

D-01. Автоматический `pull_request` запуск основного CI и acceptance checks отключается.

D-02. Агентский запуск выполняется через labels `run:ci` и `run:acceptance`; повторный запуск — снять и снова поставить соответствующий label.

D-03. Acceptance workflows сохраняют свои существующие `paths`, чтобы `run:acceptance` не запускал нерелевантные suites.

D-04. `workflow_dispatch` остаётся резервным ручным способом.

D-05. Production/deploy workflows, `UI preview Pages` и `Codex service-channel bridge` не входят в изменение.
