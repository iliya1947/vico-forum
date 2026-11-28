Этот файл фиксирует карту реальной работы администрации и модераторов Vico Forum для product-discovery задачи встроенного Admin/Moderation AI.

# Admin & Moderation AI — карта реальной работы

Дата: 28.11.2026.

## Основание

Исходная задача №3 из #300 — определить, где встроенный AI реально облегчает работу администрации и модераторов Vico Forum, не ограничиваясь прежними примерами про спам, дубликаты, классификацию и жалобы.

Это ещё не product scope и не список утверждённых AI-функций.

## 1. Модерация контента и структуры форума

Текущие canonical flows уже позволяют:
- pin/unpin, close/reopen;
- Hide/Restore тем и сообщений с обязательной причиной;
- административное управление solved/best answer и Help outcomes;
- duplicate/appeal review в Help;
- source-locale correction и чтение разрешённых revision history;
- создание/переименование/reorder категорий и разделов;
- перенос разделов и тем;
- точечную инспекцию скрытого контента.

Работа модератора здесь состоит не только в самой mutation, а в предварительном чтении контекста, проверке состояния/версий, сопоставлении соседних сообщений и выборе существующего canonical действия.

## 2. Complaints

Complaints — наиболее насыщенный ручной review-flow:
- open Queue из сгруппированных Cases;
- automatic/manual priority;
- triage по reported revision и текущему контексту;
- full Case review с reports, notes, retained evidence и контекстом;
- отдельная защищённая reporter identity projection;
- initial Decision;
- resolved History;
- до трёх последовательных Appeals с отдельной review queue;
- неизменяемая event history и participant notifications.

Санкции не выводятся автоматически из Complaint Decision: меры остаются отдельным административным действием.

## 3. Пользователи, административные меры и appeals

AP-10 требует от уполномоченного администратора:
- определить конкретные restrictions;
- выбрать temporary/permanent lifecycle и expiry;
- сформулировать обязательную причину;
- учитывать overlapping measures;
- учитывать hierarchy / issuer floor / privileged target;
- разбирать до трёх последовательных appeals;
- при принятом appeal отдельно решить lift либо изменение той же меры.

Это отдельный decision-support workload; AI не может подменять permission, hierarchy, CAS или canonical mutation.

## 4. Authorization и настройки

Owner управляет:
- custom roles;
- role grants;
- user role assignment;
- per-user allow/deny/inherit;
- registration settings.

Здесь основной риск — не объём кликов, а необходимость понимать фактические effective permissions и последствия изменения. Никакой AI не должен становиться вторым RBAC или самостоятельно менять authority.

## 5. Ordinary History

Admin History хранит значимые committed действия по authorization, topic/content moderation, structure, measures и другим подключённым операциям.

Практическая работа — найти связанные события, понять последовательность изменений и перейти к canonical объекту; History сам по себе не даёт право повторить действие.

## 6. Owner Monitoring / Super-admin

Owner имеет 13-area Overview и source-aware History/Event log:
- System;
- Accounts & authentication;
- Security;
- Forum;
- Administration;
- Moderation;
- Notifications;
- Background processes;
- Localization & translations;
- Files & attachments;
- Data;
- Integrations;
- Infrastructure placeholder.

Monitoring различает current measured state, unavailable/degraded/stale/partial coverage и оригинальные source events. Основная ручная нагрузка — интерпретировать много разнородных показателей и связать аномалию с подходящим canonical Admin/Settings/Attention/Profile контекстом.

## 7. Реальные повторяющиеся типы ручной работы

Из существующих flows следуют шесть повторяющихся классов работы:
1. собрать релевантный контекст перед решением;
2. сравнить несколько объектов/сообщений/событий между собой;
3. отделить сигнал от шума и расставить внимание;
4. кратко свести длинный Case/History/Monitoring контекст;
5. проверить, какие уже существующие canonical действия применимы;
6. объяснить человеку, почему конкретный объект требует внимания, не выполняя mutation вместо него.

Это фактическая карта workload. Следующий этап product-discovery — оценить кандидаты AI-функций по полезности, цене ошибки, приватности и возможности работать с $0 дополнительными расходами.
