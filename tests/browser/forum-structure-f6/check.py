"""F6 extension of the real F5 browser fixture; all verified effects use HTTP.

SQL creates accounts/grants/retained-reference fixtures and observes committed data.
It never substitutes for the move, publication, visibility, or download under test.
"""
import json
from urllib.parse import quote
from uuid import uuid4
from playwright.sync_api import expect


def run(*, base, admin, actor, mover, mover_id, owner, guest, account, sql,
        record, private, section_a, section_b, section_c, output):
    author, author_id = account("f6-asset-author")
    watcher, watcher_id = account("f6-watcher")
    reporter, reporter_id = account("f6-reporter")
    visibility, visibility_id = account("f6-visibility-only")

    def override(user, key, effect):
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) "
            "values($1,$2,$3) on conflict(user_id,permission_key) do update set effect=$3",
            [user, key, effect])

    override(mover_id, "forum.content.visibility.manage", "deny")
    override(visibility_id, "forum.content.visibility.manage", "allow")
    override(visibility_id, "forum.topic.move", "deny")
    asset, operation = str(uuid4()), str(uuid4())
    payload = b"F6 real local R2 attachment bytes survive ordinary and hidden topic moves."
    context = "section:" + section_a + ":new"
    uploaded = author.request.post(base + "/api/attachments", headers={
        "Origin": base, "Content-Type": "text/plain", "X-Vico-Editor-Context": quote(context, safe=""),
        "X-Vico-Operation-Id": operation, "X-Vico-Attachment-Id": asset,
        "X-Vico-Attachment-Name": "f6-retained.txt", "X-Vico-Attachment-Size": str(len(payload)),
    }, data=payload)
    assert uploaded.status == 201, (uploaded.status, uploaded.text()[:300])
    title, body = "F6 private retained title " + str(uuid4()), "F6 private retained source body " + str(uuid4())
    publication = {"title": title, "body": body, "editorActorId": author_id,
                   "editorOperationId": operation, "editorAttachmentIds": json.dumps([asset])}
    created = author.request.post(base + "/en/sections/" + quote(section_a, safe=""),
                                  headers={"Origin": base}, form=publication, max_redirects=0)
    assert created.status in (302, 303), (created.status, created.text()[:300])
    membership = sql("select p.id,p.topic_id,p.current_revision_id from forum_posts p "
                     "join forum_post_attachments a on a.post_id=p.id where a.attachment_id=$1", [asset])
    assert len(membership) == 1, membership
    post_id, topic = membership[0]["id"], membership[0]["topic_id"]
    path = "/en/topics/" + quote(topic, safe="")
    move_path = "/en/admin/forum/topics/" + quote(topic, safe="") + "/move"
    file_path = "/api/attachments/file/" + asset + "?post=" + post_id
    key = sql("select object_key from forum_attachments where id=$1", [asset])[0]["object_key"]

    def post(ctx, fields, marker="moveAction"):
        return ctx.request.post(base + path + ".data?" + marker + "=1",
                                headers={"Origin": base}, form=fields)

    def baseline(user, target):
        row = sql("select section_id,location_version::text from forum_topics where id=$1", [topic])[0]
        version = sql("select version::text from forum_structure_state where id=1")[0]["version"]
        return {"intent": "moveTopic", "editorActorId": user, "expectedSectionId": row["section_id"],
                "targetSectionId": target, "expectedStructureVersion": version,
                "expectedLocationVersion": row["location_version"]}

    def bytes_at(ctx, url):
        response = ctx.request.get(base + url)
        private(response)
        assert response.body() == payload, (url, response.status)

    def head():
        response = admin.request.post(base + "/__sa04_k5_storage_probe", headers={
            "X-K5-Token": "forum-structure-f6-local-probe"}, data={"operation": "head", "key": key})
        assert response.status == 200, response.text()[:300]
        return response.json()

    def location():
        return sql("select section_id,location_version::text,is_hidden,visibility_version "
                   "from forum_topics where id=$1", [topic])[0]

    def retained():
        return sql("select (select jsonb_agg(to_jsonb(x)) from forum_attachments x where id=$1) assets,"
                   "(select jsonb_agg(to_jsonb(x)) from forum_post_attachments x where attachment_id=$1) published,"
                   "(select jsonb_agg(to_jsonb(x)) from forum_attachment_draft_refs x where attachment_id=$1) drafts,"
                   "(select jsonb_agg(to_jsonb(x)) from forum_complaint_evidence_attachments x where attachment_id=$1) evidence,"
                   "(select jsonb_agg(to_jsonb(x)) from forum_publication_receipts x where draft_id=$2) receipt",
                   [asset, operation])

    bytes_at(guest, file_path)
    assert head() == {"exists": True, "size": len(payload)}
    record("F6 real HTTP upload/publication/download binds exact local R2 bytes")

    # Same browser session and frozen context: next HTTP request must read changed authority.
    private(mover.request.get(base + move_path + ".data"))
    frozen = baseline(mover_id, section_b)
    before = location()
    override(mover_id, "forum.topic.move", "deny")
    private(mover.request.get(base + move_path + ".data"), 403)
    private(post(mover, frozen), 403)
    assert location() == before
    override(mover_id, "forum.topic.move", "allow")
    private(mover.request.get(base + move_path + ".data"))
    measure = str(uuid4())
    sql("insert into user_measures(id,target_user_id,issuer_user_id,issuer_authority_floor,create_fingerprint,initial_reason) "
        "values($1,$2,'f5-synthetic-owner',3,$3,'F6 AP10 fixture')", [measure, mover_id, "a" * 64])
    sql("insert into user_measure_restrictions(measure_id,restriction_key)values($1,'admin.forum')", [measure])
    try:
        private(mover.request.get(base + move_path + ".data"), 403)
        private(post(mover, frozen), 403)
        assert location() == before
    finally:
        sql("delete from user_measure_restrictions where measure_id=$1", [measure])
        sql("delete from user_measures where id=$1", [measure])
    private(post(mover, frozen))
    assert location()["section_id"] == section_b
    bytes_at(guest, file_path)
    record("F6 same-session move grant revoke/AP10 block frozen requests; move-only visible success")

    # An active author's independent edit-draft reference and immutable Complaint evidence.
    draft = str(uuid4())
    draft_context = "post:" + post_id + ":edit"
    sql("insert into forum_attachment_draft_refs(attachment_id,owner_id,context_key,draft_id,created_at) "
        "values($1,$2,$3,$4,now())", [asset, author_id, draft_context, draft])
    draft_path = "/api/attachments/file/" + asset + "?operation=" + draft + "&context=" + quote(draft_context, safe="")
    complaint = reporter.request.post(base + path + "/complaints", headers={"Origin": base}, form={
        "kind": "post", "postId": post_id, "revisionId": membership[0]["current_revision_id"],
        "reason": "spam", "operationId": str(uuid4())})
    private(complaint)
    case = sql("select c.id from forum_complaint_cases c join forum_complaint_targets t on t.id=c.target_id "
               "where t.post_id=$1 and t.post_revision_id=$2", [post_id, membership[0]["current_revision_id"]])[0]["id"]
    evidence_path = "/en/attention/complaints/" + case + "/evidence/" + asset
    bytes_at(author, draft_path)
    bytes_at(mover, evidence_path)
    private(reporter.request.get(base + evidence_path), 403)
    for ctx, who, intent, field in [(watcher, watcher_id, "setTopicWatch", "watching"),
                                   (reporter, reporter_id, "setTopicWatch", "watching"),
                                   (reporter, reporter_id, "setTopicBookmark", "bookmarked"),
                                   (reporter, reporter_id, "setTopicMute", "muted")]:
        private(post(ctx, {"intent": intent, "editorActorId": who, field: "true"}, "personal"))

    title_revision = sql("select current_title_revision_id from forum_topics where id=$1", [topic])[0]["current_title_revision_id"]
    def visibility_write(kind, hidden, version):
        fields = {"intent": "setTopicVisibility" if kind == "topic" else "setPostVisibility", "editorActorId": actor,
                  "hidden": str(hidden).lower(), "expectedVisibilityVersion": str(version),
                  "expectedRevisionId": title_revision if kind == "topic" else membership[0]["current_revision_id"],
                  "reason": "F6 local R2 visibility acceptance"}
        if kind == "post":
            fields["postId"] = post_id
        private(post(admin, fields, "visibilityAction"))

    visibility_write("post", True, 0)
    visibility_write("topic", True, 0)
    frozen_hidden = baseline(actor, section_c)
    private(mover.request.get(base + move_path + ".data"), 404)
    private(post(mover, baseline(mover_id, section_c)), 404)
    private(visibility.request.get(base + move_path + ".data"), 403)
    private(post(visibility, baseline(visibility_id, section_c)), 403)
    override(actor, "forum.content.visibility.manage", "deny")
    private(admin.request.get(base + move_path + ".data"), 404)
    private(post(admin, frozen_hidden), 404)
    override(actor, "forum.content.visibility.manage", "allow")
    before_retained = retained()
    before_hidden = location()
    hidden_page = admin.new_page()
    result = hidden_page.goto(base + move_path, wait_until="networkidle")
    private(result)
    assert title not in hidden_page.locator("main").inner_text()
    assert body not in hidden_page.locator("main").inner_text()
    selector = hidden_page.locator('.topic-move-form select[name="targetSectionId"]')
    expect(selector.locator('option[value="' + section_c + '"]')).to_have_count(1)
    selector.select_option(section_c)
    with hidden_page.expect_response(lambda r: r.request.method == "POST" and "moveAction" in r.url) as moved:
        hidden_page.locator('.topic-move-form button[type="submit"]').click()
    private(moved.value)
    after_hidden = location()
    assert after_hidden == {**before_hidden, "section_id": section_c,
                            "location_version": str(int(before_hidden["location_version"]) + 1)}
    assert retained() == before_retained
    private(post(owner, baseline("f5-synthetic-owner", section_c)))  # Admitted hidden no-op.
    private(post(admin, frozen_hidden), 409)
    assert len(sql("select id from admin_history where action='topic.moved' and target_id=$1", [topic])) == 2
    event = sql("select target_label,context from admin_history where action='topic.moved' and target_id=$1", [topic])
    assert title not in json.dumps(event) and body not in json.dumps(event)
    hidden_page.screenshot(path=str(output / "f6-hidden-move.png"), full_page=True)
    hidden_page.close()
    assert guest.request.get(base + path).status == 404
    private(admin.request.get(base + "/en/admin/forum/topics/" + topic), 404)
    hidden_file = guest.request.get(base + file_path)
    private(hidden_file, 404)
    assert hidden_file.body() == b""
    bytes_at(author, draft_path)
    bytes_at(mover, evidence_path)
    bytes_at(admin, "/en/admin/forum/topics/" + topic + "/posts/" + post_id + "/attachments/" + asset)
    assert head() == {"exists": True, "size": len(payload)}
    record("F6 hidden direct Move/dual permission/revoke/Owner no-op/stale/neutral public paths and retained R2 references")

    # Matching old publication form is an inert receipt, with its original section fingerprint.
    replay = author.request.post(base + "/en/sections/" + quote(section_a, safe=""),
                                 headers={"Origin": base}, form=publication, max_redirects=0)
    assert replay.status in (302, 303), (replay.status, replay.text()[:300])
    assert retained() == before_retained
    assert location() == after_hidden
    visibility_write("topic", False, 1)
    assert sql("select is_hidden from forum_posts where id=$1", [post_id])[0]["is_hidden"] is True
    private(guest.request.get(base + file_path), 404)
    visibility_write("post", False, 1)
    bytes_at(guest, file_path)
    bytes_at(author, draft_path)
    bytes_at(mover, evidence_path)
    cleanup = admin.request.post(base + "/__sa04_k5_storage_probe", headers={
        "X-K5-Token": "forum-structure-f6-local-probe"}, data={"operation": "cleanup"})
    assert cleanup.status == 200, cleanup.text()[:300]
    assert head() == {"exists": True, "size": len(payload)}
    bytes_at(guest, file_path)
    record("F6 matching publication receipt/Restore/real cleanup retain published/draft/Complaint bytes")

    # Watch and suppression follow unchanged topic identity after both moves.
    reply = mover.request.post(base + path, headers={"Origin": base}, form={
        "intent": "reply", "editorActorId": mover_id, "body": "F6 reply after visible and hidden moves"}, max_redirects=0)
    assert reply.status in (302, 303), (reply.status, reply.text()[:300])
    reply_id = sql("select id from forum_posts where topic_id=$1 and author_id=$2", [topic, mover_id])[0]["id"]
    recipients = sql("select recipient_user_id from forum_reply_notifications where post_id=$1 and kind='reply'", [reply_id])
    assert watcher_id in [row["recipient_user_id"] for row in recipients]
    assert reporter_id not in [row["recipient_user_id"] for row in recipients]
    assert len(sql("select * from forum_topic_bookmarks where user_id=$1 and topic_id=$2", [reporter_id, topic])) == 1
    record("F6 future canonical reply preserves Watch fanout and Mute suppression after moves")

    # The real command commits, but its acknowledgement is replaced by an empty
    # HTTP response. This tests uncertain UI without faking the verified write.
    uncertain = admin.new_page()
    assert uncertain.goto(base + path, wait_until="networkidle").status == 200
    draft_reply = uncertain.locator("#reply-body")
    draft_reply.fill("F6 unsent draft through lost acknowledgement")
    uncertain.locator(".topic-admin-tools > summary").click()
    uncertain.locator(".topic-move-control > button").click()
    uncertain_form = uncertain.locator(".topic-move-form")
    expect(uncertain_form.locator('select[name="targetSectionId"] option[value="' + section_b + '"]')).to_have_count(1)
    uncertain_form.locator('select[name="targetSectionId"]').select_option(section_b)
    submitted = []
    def lose_ack(route):
        actual = route.fetch()
        assert actual.status == 200, (actual.status, actual.text()[:300])
        submitted.append(route.request.url)
        route.fulfill(status=204, headers={"X-Remix-Response": "yes", "Cache-Control": "private, no-store"}, body="")
    transport = "**/topics/" + topic + ".data?*moveAction*"
    uncertain.route(transport, lose_ack)
    uncertain_form.locator('button[type="submit"]').click()
    expect(uncertain_form.locator('[role="alert"]').first).to_be_visible()
    expect(uncertain_form.locator('button[type="submit"]')).to_be_disabled()
    assert location()["section_id"] == section_b
    expect(draft_reply).to_have_value("F6 unsent draft through lost acknowledgement")
    assert len(submitted) == 1
    uncertain.unroute(transport, lose_ack)
    uncertain_form.get_by_role("button", name="Refresh move details", exact=True).click()
    expect(uncertain_form.locator('input[name="expectedSectionId"]')).to_have_value(section_b)
    expect(uncertain_form.locator('input[name="expectedLocationVersion"]')).to_have_value(location()["location_version"])
    assert len(submitted) == 1
    expect(draft_reply).to_have_value("F6 unsent draft through lost acknowledgement")
    uncertain.close()
    record("F6 real commit with lost acknowledgement requires explicit fresh read and never replays POST")
