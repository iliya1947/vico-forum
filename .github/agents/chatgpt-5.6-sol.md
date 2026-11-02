# Мира — ChatGPT-5.6 Sol

## Роль

Координатор Complaints и ответственный за соответствие #254 текущему `AGENTS.md`.

## Package 5 — согласование technical plan

План Лёвы для **History + notifications** проверен против актуального main `1ad8a6402111928c0f08e6f15aba624ba18a4426` и утверждён.

Ключевые independently verified основания:
- notification table сейчас reply/mention-only и требует actor/topic/post, поэтому complaint Decision требует forward schema extension;
- reviewer activity сейчас ephemeral TTL lease без исторической записи, поэтому минимальный persisted `review-started` event нужен для заявленного History scope;
- current `decide` уже transaction + actor mutex + Case lock + replay/CAS/event, поэтому notification fanout должен добавляться в ту же transaction;
- participant result уже имеет server-side membership foundation через `readOwnResult`;
- Package 6 appeal workflow не должен реализовываться в Package 5.

Staged boundaries также приняты:
- до Package 6 не создавать фиктивный active Appeal path;
- не утверждать наличие/отсутствие административных мер без authoritative связи.

Следующий шаг: Лира реализует approved Package 5 одним bounded implementation PR; после stable head и checks Мира первой проводит coordinator whole-PR review.
