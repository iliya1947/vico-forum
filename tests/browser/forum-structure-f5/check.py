"""Shared F5 UI fixture; --full-feature adds F6 HTTP/Chromium/local-R2 matrix."""
import argparse
import json
import os
import re
import runpy
import select
import shutil
import subprocess
from pathlib import Path
from urllib.parse import quote, urlparse
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect

arg=argparse.ArgumentParser()
arg.add_argument("--url",required=True)
arg.add_argument("--output",type=Path,required=True)
arg.add_argument("--full-feature",action="store_true")
a=arg.parse_args()
base=a.url.rstrip("/")
db=urlparse(os.environ["DATABASE_URL"])
assert os.environ.get("CI")=="true"
assert urlparse(base).hostname in ("localhost","127.0.0.1")
assert db.hostname in ("localhost","127.0.0.1") and db.path in ("/vico_f5_browser_test","/vico_f6_browser_test")
a.output.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parents[3]
pg=subprocess.Popen([shutil.which("node"),"--import","tsx",str(Path(__file__).with_name("pg.mjs"))],
    cwd=repo,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
assert pg.stdout.readline().strip()=="READY"
cases,errors,external=[],[],[]
prefix="f5-"+uuid4().hex[:16]

def rpc(value):
    pg.stdin.write(json.dumps(value,ensure_ascii=False)+"\n")
    pg.stdin.flush()
    assert select.select([pg.stdout],[],[],45)[0],"F5 PG fixture timeout"
    result=json.loads(pg.stdout.readline())
    assert "error" not in result,result
    return result["result"]

def sql(statement,params=None):
    return rpc({"op":"sql","sql":statement,"params":params or []})

def record(name):
    cases.append(name)
    print("F5_CONNECTED "+name,flush=True)

def private(response,status=200):
    assert response.status==status,(response.status,status,response.text()[:350])
    assert {"private","no-store"}.issubset(set(x.strip() for x in response.headers.get("cache-control","").split(","))),response.headers

def visit(page,path,status=200):
    result=page.goto(base+path,wait_until="networkidle")
    private(result,status)
    return result

def form(page,intent):
    candidate=page.locator('form:has(input[name="intent"][value="'+intent+'"])')
    expect(candidate).to_have_count(1)
    return candidate

def write(page,intent,field=None,value=None,button=None,status=200):
    f=form(page,intent)
    if field is not None:f.locator('[name="'+field+'"]').fill(value)
    with page.expect_response(lambda r:r.request.method=="POST" and "/admin/forum" in r.url) as pending:
        (f.locator('button[type="submit"][value="'+button+'"]') if button else f.locator('button[type="submit"]')).click()
    private(pending.value,status)
    return pending.value

def object_id(table,name):
    found=sql("select id from "+table+" where name=$1",[name])
    assert len(found)==1,(table,name,found)
    return found[0]["id"]

def title_from_db(topic):
    return sql("select section_id,location_version::text location_version,is_hidden from forum_topics where id=$1",[topic])[0]

def create_category(page,name):
    visit(page,"/en/admin/forum")
    write(page,"createCategory","name",name)
    return object_id("forum_categories",name)

def create_section(page,category_id,name):
    visit(page,"/en/admin/forum/categories/"+quote(category_id,safe=""))
    write(page,"createSection","name",name)
    return object_id("forum_sections",name)

def assert_no_overflow(page,context):
    result=page.evaluate("""() => {
      const width=innerWidth;
      return {
        width,scrollWidth:document.documentElement.scrollWidth,
        offenders:[...document.querySelectorAll('*')]
          .filter(node=>{
            const r=node.getBoundingClientRect();
            return r.width>0 && (r.right>width+1 || r.left < -1);
          }).slice(0,20).map(node=>({
            tag:node.tagName,cls:String(node.className).slice(0,110),
            left:Math.round(node.getBoundingClientRect().left),
            right:Math.round(node.getBoundingClientRect().right),
            scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,
          }))
      };
    }""")
    assert result["scrollWidth"]<=result["width"]+1,(context,json.dumps(result))

def payload(form):
    return form.locator("input[name=editorActorId]").input_value()

try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,
            executable_path=os.environ.get("PLAYWRIGHT_EXECUTABLE") or None,
            channel=None if os.environ.get("PLAYWRIGHT_EXECUTABLE") else "chrome",
            args=["--no-sandbox"])
        contexts=[]
        def context():
            c=browser.new_context(viewport={"width":1280,"height":900},service_workers="block",
                extra_http_headers={"cf-connecting-ip":"192.0.2."+str(80+len(contexts))})
            contexts.append(c)
            c.on("page",lambda page:page.on("pageerror",lambda e:errors.append(str(e))))
            c.route("**/*",lambda route:route.continue_() if route.request.url.startswith(base+"/")
                else (external.append(route.request.url),route.abort())[-1])
            return c
        def account(label):
            c=context()
            r=c.request.post(base+"/api/auth/sign-up/email",headers={"Origin":base},
                data={"name":prefix+"-"+label,"email":prefix+"-"+label+"@test.invalid",
                      "password":"F5-synthetic-password-123456"})
            assert r.status==200,r.text()[:350]
            return c,r.json()["user"]["id"]

        guest=context()
        private(guest.request.get(base+"/en/admin/forum"),401)
        admin,actor=account("admin")
        mover,mover_id=account("mover")
        owner,issued=account("owner")
        sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin'),($2,'builtin-moderator')",[actor,mover_id])
        sql('insert into "user"(id,name,email) values($1,$2,$3)',
            ["f5-synthetic-owner",prefix+" synthetic owner",prefix+"-bound@test.invalid"])
        assert len(sql('update "session" set user_id=$1 where user_id=$2 returning id',
                       ["f5-synthetic-owner",issued]))>=1
        p=admin.new_page()
        p.set_default_timeout(18000)
        cat_a=create_category(p,prefix+" category A עברית")
        cat_b=create_category(p,prefix+" category B שלום")
        category_a="/en/admin/forum/categories/"+quote(cat_a,safe="")
        visit(p,category_a)
        write(p,"renameCategory","name",prefix+" category RENAMED")
        visit(p,category_a)
        write(p,"reorderCategory",button="down")
        result=sql("select action from admin_history where action like 'category.%' order by position")
        assert sorted(x["action"] for x in result)==[
            "category.created","category.created","category.renamed","category.reordered"]
        record("actual category create/rename/order and atomic source History")

        section_a=create_section(p,cat_a,prefix+" source section")
        section_other=create_section(p,cat_a,prefix+" sibling section")
        section_b=create_section(p,cat_b,prefix+" destination section")
        src_path="/en/admin/forum/sections/"+quote(section_a,safe="")
        visit(p,src_path)
        write(p,"renameSection","name",prefix+" source RENAMED")
        visit(p,src_path)
        write(p,"reorderSection",button="down")
        neighbor_path="/en/admin/forum/sections/"+quote(section_other,safe="")
        visit(p,neighbor_path)
        moved=form(p,"moveSection")
        expect(moved.locator('select[name="targetCategoryId"] option[value="'+cat_b+'"]')).to_have_count(1)
        moved.locator('select[name="targetCategoryId"]').select_option(cat_b)
        with p.expect_response(lambda r:r.request.method=="POST" and "/admin/forum" in r.url) as pending:
            moved.locator('button[type="submit"]').click()
        private(pending.value)
        assert sql("select category_id from forum_sections where id=$1",[section_other])[0]["category_id"]==cat_b
        assert len(sql("select id from admin_history where action='section.moved'"))==1
        record("actual section create/rename/order/reparent, stable ID and one event")

        topic=rpc({"op":"topic","sectionId":section_a,"authorId":actor})
        topic_id=topic["topicId"]
        path="/en/topics/"+quote(topic_id,safe="")
        public=guest.new_page()
        assert public.goto(base+path,wait_until="networkidle").status==200
        public.close()
        denied=guest.request.post(base+path,headers={"Origin":base},form={
            "intent":"moveTopic","editorActorId":actor,"expectedSectionId":section_a,
            "targetSectionId":section_b,"expectedStructureVersion":"999","expectedLocationVersion":"0"})
        private(denied,401)
        wrong=admin.request.post(base+path,headers={"Origin":"https://not-owned.invalid"},form={
            "intent":"moveTopic","editorActorId":actor,"expectedSectionId":section_a,
            "targetSectionId":section_b,"expectedStructureVersion":"999","expectedLocationVersion":"0"})
        assert wrong.status in (400,403),(wrong.status,wrong.text()[:200])
        if wrong.status==400:
            assert wrong.text().strip()=="Bad Request",wrong.text()[:200]
            assert wrong.headers.get("vary")=="Origin",wrong.headers
        else:
            private(wrong,403)
        mixed=admin.request.post(base+path,headers={"Origin":base},form={
            "intent":"reply","editorActorId":actor,"body":"MIXED_UNEXPECTED_POST",
            "expectedSectionId":section_a,"targetSectionId":section_b})
        private(mixed,400)
        assert sql("select count(*)::int n from forum_posts where topic_id=$1",[topic_id])[0]["n"]==2
        record("guest/cross-origin/mixed intent denied before publication")

        visit(p,path)
        p.locator(".topic-title-editor > button").click()
        draft_title=p.locator('.topic-title-editor input[name="title"]')
        draft_title.fill("F5 unsent title draft עברית")
        reply=p.locator("#reply-body")
        expect(reply).to_be_visible()
        reply.fill("F5 retained reply draft first")
        reply.press("End")
        reply.type(" more")
        post=p.locator("#post-"+topic["answerId"])
        post.get_by_role("button",name="Edit",exact=True).click()
        post_draft=p.locator(".topic-post-edit-form textarea")
        expect(post_draft).to_be_visible()
        post_draft.fill("F5 retained post draft")
        held_uploads=[]
        def hold_upload(route):
            held_uploads.append(route)
            # Keep the real browser XHR pending while the independent Move commits.
        p.route("**/api/attachments",hold_upload)
        reply_file=p.locator('.topic-reply-form input[type="file"]')
        reply_file.set_input_files({
            "name":"f5-inflight-upload.txt","mimeType":"text/plain",
            "buffer":b"F5 browser-pending attachment bytes",
        })
        uploading=p.locator(".topic-reply-form .markdown-editor-attachment.is-uploading")
        expect(uploading).to_have_count(1)
        assert len(held_uploads)==1,len(held_uploads)
        p.evaluate("""() => {
          window.__f5_editor_nodes={
            title:document.querySelector('.topic-title-editor input[name=title]'),
            reply:document.querySelector('#reply-body'),
            post:document.querySelector('.topic-post-edit-form textarea'),
            file:document.querySelector('.topic-reply-form input[type=file]')
          }
        }""")
        p.locator(".topic-admin-tools > summary").click()
        p.locator(".topic-move-control > button").click()
        mf=p.locator(".topic-move-form form")
        expect(mf.locator('select[name="targetSectionId"] option[value="'+section_b+'"]')).to_have_count(1)
        mf.locator('select[name="targetSectionId"]').select_option(section_b)
        with p.expect_response(lambda r:r.request.method=="POST" and "moveAction" in r.url) as pending:
            mf.locator('button[type="submit"]').click()
        private(pending.value,200)
        expect(p.locator('.topic-breadcrumb-row a[href="/en/sections/'+quote(section_b,safe='')+'"]').first).to_be_visible()
        assert title_from_db(topic_id)["section_id"]==section_b
        expect(draft_title).to_have_value("F5 unsent title draft עברית")
        expect(reply).to_have_value("F5 retained reply draft first more")
        expect(post_draft).to_have_value("F5 retained post draft")
        expect(uploading).to_have_count(1)
        expect(uploading).to_contain_text("f5-inflight-upload.txt")
        assert len(held_uploads)==1
        assert p.evaluate("""() => {
          const x=window.__f5_editor_nodes;
          return x.title===document.querySelector('.topic-title-editor input[name=title]') &&
            x.reply===document.querySelector('#reply-body') &&
            x.post===document.querySelector('.topic-post-edit-form textarea') &&
            x.file===document.querySelector('.topic-reply-form input[type=file]')
        }""")
        reply.press("Control+z")
        assert reply.input_value()!="F5 retained reply draft first more"
        held_uploads[0].fulfill(status=503,content_type="application/json",body='{"error":"unavailable"}')
        expect(p.locator(".topic-reply-form .markdown-editor-attachment.is-error")).to_have_count(1)
        p.unroute("**/api/attachments",hold_upload)
        record("real Move revalidation preserves title/reply/post Editor DOM, undo and pending attachment XHR")

        for locale,direction in [("en","ltr"),("ru","ltr"),("he","rtl")]:
            for width in [320,390]:
                p.set_viewport_size({"width":width,"height":844})
                visit(p,"/"+locale+"/admin/forum")
                expect(p.locator('form:has(input[name="intent"][value="createCategory"])')).to_be_visible()
                assert p.locator("html").get_attribute("dir")==direction
                assert_no_overflow(p,(locale,width,"admin"))
                visit(p,"/"+locale+"/admin/forum/sections/"+quote(section_b,safe=""))
                assert_no_overflow(p,(locale,width,"section"))
                visit(p,"/"+locale+"/topics/"+quote(topic_id,safe=""))
                p.locator(".topic-admin-tools > summary").click()
                p.locator(".topic-move-control > button").focus()
                p.keyboard.press("Enter")
                expect(p.locator(".topic-move-form")).to_be_visible()
                assert_no_overflow(p,(locale,width,"move"))
                if width==320:p.screenshot(path=str(a.output/(locale+"-320.png")),full_page=True)
        record("EN/RU/HE narrow+RTL, keyboard-opened Move and structural forms")

        new_topic=rpc({"op":"topic","sectionId":section_a,"authorId":actor})
        second_path="/en/topics/"+quote(new_topic["topicId"],safe="")
        stale_tab=admin.new_page()
        fresh_tab=admin.new_page()
        for tab in (stale_tab,fresh_tab):
            visit(tab,second_path)
            tab.locator(".topic-admin-tools > summary").click()
            tab.locator(".topic-move-control > button").click()
            expect(tab.locator('.topic-move-form select[name="targetSectionId"] option[value="'+section_b+'"]')).to_have_count(1)
            tab.locator('.topic-move-form select[name="targetSectionId"]').select_option(section_b)
        with fresh_tab.expect_response(lambda r:r.request.method=="POST" and "moveAction" in r.url) as moved:
            fresh_tab.locator('.topic-move-form button[type="submit"]').click()
        private(moved.value)
        with stale_tab.expect_response(lambda r:r.request.method=="POST" and "moveAction" in r.url) as conflict:
            stale_tab.locator('.topic-move-form button[type="submit"]').click()
        private(conflict.value,409)
        expect(stale_tab.locator(".topic-move-form [role=alert]")).to_be_visible()
        expect(stale_tab.locator('.topic-move-form button[type=submit]')).to_be_disabled()
        assert len(sql("select id from admin_history where action='topic.moved' and target_id=$1",
                       [new_topic["topicId"]]))==1
        record("two authentic tabs yield stale409 and one original Move event")

        other=owner.new_page()
        visit(other,"/en/super-admin/monitoring/forum/forum.structure/history")
        expect(other.locator('li[data-history-kind="topic.moved"]').first).to_be_visible()
        original=sql("select id from admin_history where action='topic.moved' and target_id=$1",[topic_id])[0]["id"]
        expect(other.locator('li[data-history-kind="topic.moved"]').filter(has_text=original)).to_have_count(1)
        assert "F5 original topic body" not in other.locator("main").inner_text()
        assert "F5 original topic title" not in other.locator("main").inner_text()
        record("exact Owner forum.structure shows original ID, bounded before/after without content")

        if a.full_feature:
            runpy.run_path(str(repo/"tests/browser/forum-structure-f6/check.py"))["run"](
                base=base,admin=admin,actor=actor,mover=mover,mover_id=mover_id,owner=owner,
                guest=guest,account=account,sql=sql,record=record,private=private,
                section_a=section_a,section_b=section_b,section_c=section_other,output=a.output)

        assert not errors,errors
        assert not external,external
        browser.close()
finally:
    pg.stdin.close()
    pg.wait(timeout=20)
    (a.output/"results.json").write_text(json.dumps({
        "implementationSha":os.environ.get("IMPLEMENTATION_SHA"),
        "checkoutSha":subprocess.check_output(["git","rev-parse","HEAD"],cwd=repo,text=True).strip(),
        "fullFeature":a.full_feature,"cases":cases,"pageErrors":errors,"external":external},ensure_ascii=False,indent=2))
