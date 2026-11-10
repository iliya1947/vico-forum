# Лёва — authentication lifecycle

## Current assignment

Подготовить технический план **AUTH-01 — Mail foundation** против актуального `main`.

## Требуемый результат

1. Определить минимальный repository/local-CI scope AUTH-01 и затрагиваемые существующие auth/runtime точки.
2. Зафиксировать provider-neutral mail boundary, fake/test transport и места будущих Resend/Brevo adapters без их реального подключения.
3. Определить применимые tests/acceptance и security boundaries из утверждённого плана.
4. Проверить, действительно ли нужны schema/dependency/runtime-interface изменения; не добавлять их без необходимости.
5. Не планировать AUTH-02+ реализацию в этот bounded package и не выполнять implementation.
6. Результат записать в служебный PR так, чтобы Лира могла реализовать AUTH-01 отдельным implementation PR.
