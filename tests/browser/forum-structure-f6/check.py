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
    frozen_section = uncertain_form.locator('input[name="expectedSectionId"]').input_value()
    frozen_location = uncertain_form.locator('input[name="expectedLocationVersion"]').input_value()
    submitted = []
    uncertain.on("request", lambda request: submitted.append(request.url)
                 if request.method == "POST" and "moveAction" in request.url else None)
    def lose_ack(route):
        actual = route.fetch()
        assert actual.status == 200, (actual.status, actual.text()[:300])
        route.fulfill(status=204, headers={"X-Remix-Response": "yes", "Cache-Control": "private, no-store"}, body="")
    transport = "**/topics/" + topic + ".data?*moveAction*"
    uncertain.route(transport, lose_ack)
    with uncertain.expect_response(lambda response: response.request.method == "POST" and "moveAction" in response.url) as lost_move:
        uncertain_form.locator('button[type="submit"]').click()
    assert lost_move.value.status == 204
    expect(uncertain_form.locator('[role="alert"]').first).to_be_visible()
    expect(uncertain_form.locator('button[type="submit"]')).to_be_disabled()
    assert location()["section_id"] == section_b
    expect(draft_reply).to_have_value("F6 unsent draft through lost acknowledgement")
    assert len(submitted) == 1
    # R4a-03: real adjacent Watch revalidates already mounted private fetchers.
    with uncertain.expect_response(lambda response: response.request.method == "GET" and "/move.data" in response.url):
        with uncertain.expect_response(lambda response: response.request.method == "POST" and "moveAction" not in response.url) as watched:
            uncertain.locator('.topic-watch-control button[type="submit"]').click()
        private(watched.value)
    uncertain.wait_for_load_state("networkidle")
    expect(uncertain_form.locator('input[name="expectedSectionId"]')).to_have_value(frozen_section)
    expect(uncertain_form.locator('input[name="expectedLocationVersion"]')).to_have_value(frozen_location)
    expect(uncertain_form.locator('button[type="submit"]')).to_be_disabled()
    expect(draft_reply).to_have_value("F6 unsent draft through lost acknowledgement")
    assert len(sql("select * from forum_topic_watches where user_id=$1 and topic_id=$2", [actor, topic])) == 1
    uncertain_form.locator("form").dispatch_event("submit")
    assert len(submitted) == 1
    uncertain_form.get_by_role("button", name="Refresh move details", exact=True).click()
    expect(uncertain_form.locator('input[name="expectedSectionId"]')).to_have_value(section_b)
    expect(uncertain_form.locator('input[name="expectedLocationVersion"]')).to_have_value(location()["location_version"])
    assert len(submitted) == 1
    expect(draft_reply).to_have_value("F6 unsent draft through lost acknowledgement")
    uncertain.unroute(transport, lose_ack)
    uncertain.close()
    record("R4a-03 real Move commit/lost acknowledgement stays fenced through actual Watch revalidation until explicit fresh read; no replay")

    # WF-01: commit the real category command and lose only its typed receipt.
    # Observe every POST through explicit refresh, independently of interception.
    category_page = admin.new_page()
    assert category_page.goto(base + "/en/admin/forum", wait_until="networkidle").status == 200
    category_form = category_page.locator('form:has(input[name="intent"][value="createCategory"])')
    category_name = "WF-01 unconfirmed category " + str(uuid4())
    category_form.locator('input[name="name"]').fill(category_name)
    category_version = category_form.locator('input[name="expectedStructureVersion"]')
    original_version = category_version.input_value()
    category_posts = []
    category_page.on("request", lambda request: category_posts.append(request.url) if request.method == "POST" else None)

    def lose_category_ack(route):
        if route.request.method != "POST":
            route.continue_()
            return
        actual = route.fetch()
        assert actual.status == 200, (actual.status, actual.text()[:300])
        route.fulfill(status=204, headers={"X-Remix-Response": "yes", "Cache-Control": "private, no-store"}, body="")

    category_transport = "**/en/admin/forum.data*"
    category_page.route(category_transport, lose_category_ack)
    category_submit = category_form.locator('button[type="submit"]')
    with category_page.expect_response(lambda response: response.request.method == "POST" and "/en/admin/forum.data" in response.url) as lost_category:
        category_submit.click()
    assert lost_category.value.status == 204
    expect(category_page.get_by_role("alert")).to_contain_text("The result could not be confirmed.")
    expect(category_submit).to_be_disabled()
    expect(category_form.locator('input[name="name"]')).to_have_value(category_name)
    expect(category_version).to_have_value(original_version)

    def committed_category():
        rows = sql("select id from forum_categories where name=$1", [category_name])
        assert len(rows) == 1, rows
        assert len(sql("select id from admin_history where action='category.created' and target_id=$1", [rows[0]["id"]])) == 1
        assert len(category_posts) == 1, category_posts

    committed_category()
    # Neither a disabled click nor another submit event may send a new command.
    category_submit.evaluate("button => button.click()")
    category_form.dispatch_event("submit")
    category_page.wait_for_load_state("networkidle")
    committed_category()
    category_page.screenshot(path=str(output / "wf01-category-unconfirmed.png"), full_page=True)
    category_page.get_by_role("button", name="Refresh structure", exact=True).click()
    current_version = sql("select version::text from forum_structure_state where id=1")[0]["version"]
    assert current_version != original_version
    expect(category_version).to_have_value(current_version)
    expect(category_submit).to_be_enabled()
    expect(category_form.locator('input[name="name"]')).to_have_value(category_name)
    category_page.wait_for_load_state("networkidle")
    committed_category()
    category_page.unroute(category_transport, lose_category_ack)
    category_page.close()
    record("WF-01 real category commit/lost acknowledgement preserves name, fences retries and refreshes without POST replay")

    # R2a-01: controlled unsupported transition only for an admitted ordinary topic.
    unchanged = location()
    events = sql("select id from admin_history where action='topic.moved' and target_id=$1", [topic])
    private(post(admin, baseline(actor, "help-solutions-questions")), 409)
    assert location() == unchanged
    assert sql("select id from admin_history where action='topic.moved' and target_id=$1", [topic]) == events
    missing = admin.request.post(base + "/en/topics/" + str(uuid4()) + ".data?moveAction=1",
                                 headers={"Origin": base}, form=baseline(actor, "help-solutions-questions"))
    private(missing, 404)
    record("R2a-01 admitted ordinary to Help is 409; absent target stays private 404 without effects")

    # R3b-01: create a genuine Help question, then Hide via its canonical action.
    help_author, help_actor = account("r3b-help-author")
    help_created = help_author.request.post(base + "/en/categories/help-solutions", headers={"Origin": base}, form={
        "intent": "createHelpQuestion", "title": "R3b Help fixture " + str(uuid4()), "body": "Help inspection fixture",
        "editorActorId": help_actor, "editorOperationId": str(uuid4()), "editorAttachmentIds": "[]"}, max_redirects=0)
    assert help_created.status in (302, 303), (help_created.status, help_created.text()[:300])
    help_path = help_created.headers["location"]
    help_id = help_path.rsplit("/", 1)[-1]
    help_revision = sql("select current_title_revision_id from forum_topics where id=$1", [help_id])[0]["current_title_revision_id"]
    hidden_help = admin.request.post(base + help_path + ".data?visibilityAction=1", headers={"Origin": base}, form={
        "intent": "setTopicVisibility", "editorActorId": actor, "hidden": "true", "expectedVisibilityVersion": "0",
        "expectedRevisionId": help_revision, "reason": "R3b hidden Help inspection"})
    private(hidden_help)
    inspector = admin.new_page()
    private(inspector.goto(base + "/en/admin/forum/topics/" + help_id + "/inspect", wait_until="networkidle"))
    expect(inspector.get_by_role("heading", name="Visibility inspection", exact=True)).to_be_visible()
    expect(inspector.get_by_role("link", name="Move topic", exact=True)).to_have_count(0)
    inspector.screenshot(path=str(output / "r3b-hidden-help-inspection.png"), full_page=True)
    private(admin.request.get(base + "/en/admin/forum/topics/" + help_id + "/move.data"), 404)
    help_move = {**baseline(actor, section_a), "expectedSectionId": "help-solutions-questions", "expectedLocationVersion": "0"}
    private(admin.request.post(base + help_path + ".data?moveAction=1", headers={"Origin": base}, form=help_move), 404)
    public_help = guest.request.get(base + help_path)
    assert public_help.status == 404
    assert "no-store" in public_help.headers.get("cache-control", "")
    assert "Help inspection fixture" not in public_help.text()
    inspector.close()
    record("R3b-01 actual Help create/Hide/inspection has no Move link; private context/write/public remain neutral 404")

    # R4a-01: the real early authorization response is generic operation:structure.
    structural = admin.new_page()
    private(structural.goto(base + "/en/admin/forum/sections/" + quote(section_c, safe=""), wait_until="networkidle"))
    rename = structural.locator('form:has(input[name="intent"][value="renameSection"])')
    rename.locator('input[name="name"]').fill("R4a retained rename draft")
    reparent = structural.locator('form:has(input[name="intent"][value="moveSection"])')
    expect(reparent.locator('select[name="targetCategoryId"] option')).not_to_have_count(1)
    selected_category = reparent.locator('select[name="targetCategoryId"] option').nth(1).get_attribute("value")
    reparent.locator('select[name="targetCategoryId"]').select_option(selected_category)
    old_name = sql("select name from forum_sections where id=$1", [section_c])[0]["name"]
    override(actor, "forum.structure.manage", "deny")
    try:
        with structural.expect_response(lambda response: response.request.method == "POST" and "/admin/forum/sections/" in response.url) as denied:
            rename.locator('button[type="submit"]').click()
        private(denied.value, 403)
        wrapper = structural.locator('.admin-forum-structure-form').filter(has=rename)
        expect(wrapper.get_by_role("alert")).to_contain_text("You cannot change the forum structure.")
        expect(rename.locator('input[name="name"]')).to_have_value("R4a retained rename draft")
        expect(rename.locator('button[type="submit"]')).to_be_disabled()
        expect(reparent.locator('select[name="targetCategoryId"]')).to_have_value(selected_category)
        assert sql("select name from forum_sections where id=$1", [section_c])[0]["name"] == old_name
    finally:
        override(actor, "forum.structure.manage", "allow")
    wrapper.get_by_role("button", name="Refresh structure", exact=True).click()
    expect(rename.locator('button[type="submit"]')).to_be_enabled()
    expect(rename.locator('input[name="name"]')).to_have_value("R4a retained rename draft")
    structural.close()
    record("R4a-01 real early generic 403 preserves structural drafts/selection and requires deliberate recovery")

    # R4b-01: all eight actual original facts appear in ordinary full History.
    history = admin.new_page()
    private(history.goto(base + "/en/admin/history", wait_until="networkidle"))
    expected_actions = {"Category created", "Category renamed", "Category order changed", "Section created",
                        "Section renamed", "Section moved", "Section order changed", "Topic moved"}
    observed = set()
    for _ in range(8):
        for row in history.locator('.admin-history-events > li').all():
            label = row.locator("h3").inner_text()
            if label in expected_actions:
                expect(row.locator('.admin-structure-history-change')).to_be_visible()
                expect(row.locator('.admin-structure-history-change dt').first).to_have_text("Version before")
                assert "/en/admin/forum/" in row.locator("a").get_attribute("href")
                assert title not in row.inner_text() and body not in row.inner_text()
                observed.add(label)
        if observed == expected_actions:
            break
        older = history.get_by_role("link", name="Older actions", exact=True)
        assert older.count() == 1, observed
        older.click()
        history.wait_for_load_state("networkidle")
    assert observed == expected_actions, observed
    history.screenshot(path=str(output / "r4b-admin-structure-history.png"), full_page=True)
    private(history.goto(base + "/en/admin", wait_until="networkidle"))
    expect(history.locator('.admin-structure-history-change').first).to_be_visible()
    history.close()
    record("R4b-01 ordinary Admin full/recent History shows all eight bounded structural before/after facts and target links")
