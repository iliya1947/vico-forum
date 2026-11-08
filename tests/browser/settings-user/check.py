"""SET-03 real Chromium -> built Worker -> Better Auth -> disposable PostgreSQL17."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
from urllib.parse import quote, urlencode, urlparse
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:4189")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
db = os.environ.get("DATABASE_URL", "")
assert urlparse(base).hostname in ("127.0.0.1", "localhost")
assert urlparse(db).hostname in ("127.0.0.1", "localhost") and urlparse(db).path.endswith("_test")
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
prefix = "set03-" + uuid4().hex
records, page_errors, external = [], [], []

def sql(statement, parameters=None):
    code = """import pg from 'pg';
const input=JSON.parse(await new Promise(r=>{let s='';
process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>r(s));}));
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{console.log(JSON.stringify((await client.query(input.sql,input.parameters)).rows??[]));}
finally{await client.end();}"""
    run = subprocess.run([node, "--input-type=module", "-e", code], cwd=repo,
                         input=json.dumps({"sql": statement, "parameters": parameters or []}),
                         text=True, capture_output=True, check=True)
    return json.loads(run.stdout)

def record(name, **details):
    result = {"case": name, **details}
    records.append(result)
    print("SET03_ACCEPTANCE " + json.dumps(result, ensure_ascii=False), flush=True)

def document(page, path, status=200, private=False):
    response = page.goto(base + path, wait_until="networkidle")
    assert response is not None and response.status == status, (path, getattr(response, "status", None))
    if private:
        directives = {item.strip().lower() for item in response.headers.get("cache-control", "").split(",")}
        assert {"private", "no-store"} <= directives, (path, response.headers)
    return response

def post(context, fields, origin=base):
    return context.request.post(base + "/en/settings/user", headers={
        "Origin": origin, "Content-Type": "application/x-www-form-urlencoded",
    }, data=urlencode(fields), max_redirects=0)

def actor(browser, name):
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    context.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/")
                  else (external.append(route.request.url), route.abort())[-1])
    signup = context.request.post(base + "/api/auth/sign-up/email",
        headers={"Origin": base}, data={"name": "SET03 " + name,
        "email": prefix + "-" + name + "@test.invalid", "password": "synthetic-browser-password-123456"})
    assert signup.status == 200, (name, signup.status, signup.text()[:250])
    identifier = signup.json()["user"]["id"]
    page = context.new_page()
    page.set_default_timeout(20000)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    return context, page, identifier

def topic_fixture(author_id):
    topic_id = prefix + "-topic"
    sql("""with topic as (
      insert into forum_topics(id,section_id,author_id,current_title_revision_id)
      values($1,'help-solutions-questions',$2,$3) returning id)
      insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale)
      select $3,id,$2,'SET-03 preference acceptance topic','en' from topic""",
        [topic_id, author_id, prefix + "-title"])
    sql("""with post as (
      insert into forum_posts(id,topic_id,author_id,current_revision_id)
      values($1,$2,$3,$4) returning id)
      insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale)
      select $4,id,$3,$5,'en' from post""",
        [prefix + "-post", topic_id, author_id, prefix + "-revision",
         "Markdown preference fixture.\n\n~~~ts\nconst answer = 42;\n~~~"])
    return topic_id

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel=os.environ.get("PLAYWRIGHT_CHANNEL", "chromium"),
                                             headless=True, args=["--no-sandbox"])
        guest_context = browser.new_context()
        guest_context.route("**/*", lambda route: route.continue_()
                            if route.request.url.startswith(base + "/")
                            else (external.append(route.request.url), route.abort())[-1])
        guest = guest_context.new_page()
        guest.on("pageerror", lambda error: page_errors.append(str(error)))
        document(guest, "/en/settings/user", 401, private=True)
        denied = post(guest_context, [("intent", "save-locale"), ("locale", "ru"), ("expectedUserId", "forged")])
        assert denied.status == 401
        record("guest-private-load-and-write-rejection")

        # A published locale outside EN/RU/HE proves that this does not hard-code language choices.
        sql("""insert into locales(tag,translation_status,publication_status,direction,
          fallback_chain,aliases,match_tags,native_name,presentation_metadata)
          values('fr-CA','draft','active','ltr',ARRAY['en']::text[],
                 ARRAY[]::text[],ARRAY[]::text[],'Français (Canada)','{}'::jsonb)""")
        a_context, settings, a_id = actor(browser, "alice")
        b_context, other, b_id = actor(browser, "bob")
        document(settings, "/en/settings/user", private=True)
        expect(settings.get_by_role("heading", name="User preferences")).to_have_count(1)
        options = settings.locator("#settings-preferred-locale option").evaluate_all(
            "(nodes) => nodes.map(n => n.value)")
        assert set(options) == {"", "en", "ru", "he", "fr-CA"}, options
        record("unknown-published-locale-uses-runtime-registry")

        wrong = post(a_context, [("intent", "save-locale"), ("locale", "ru"), ("expectedUserId", b_id)])
        assert wrong.status == 409, ("stale account", wrong.status)
        for invalid in ("ka", "iw", "fr-ca", "not-a-locale"):
            rejection = post(a_context, [
                ("intent", "save-locale"), ("locale", invalid), ("expectedUserId", a_id)])
            assert rejection.status == 400, (invalid, rejection.status)
        cross_origin = post(a_context, [
            ("intent", "save-locale"), ("locale", "he"), ("expectedUserId", a_id)],
            origin="https://untrusted.invalid")
        assert cross_origin.status in (400, 403), ("foreign origin", cross_origin.status)
        assert sql('select locale from "user" where id=$1', [a_id])[0]["locale"] is None
        record("wrong-identity-invalid-alias-and-origin-fail-closed")

        settings.locator("#settings-preferred-locale").select_option("ru")
        settings.get_by_role("button", name="Save language").click()
        settings.wait_for_url("**/ru/settings/user?localeSaved=1")
        assert sql('select locale from "user" where id=$1', [a_id])[0]["locale"] == "ru"
        root = a_context.request.get(base + "/", max_redirects=0)
        assert root.status == 307 and root.headers["location"] == "/ru/", (root.status, root.headers)
        document(settings, "/en/settings/user", private=True)
        expect(settings.locator("#settings-preferred-locale")).to_have_value("ru")
        settings.locator("#settings-preferred-locale").select_option("fr-CA")
        settings.get_by_role("button", name="Save language").click()
        settings.wait_for_url("**/fr-CA/settings/user?localeSaved=1")
        assert sql('select locale from "user" where id=$1', [a_id])[0]["locale"] == "fr-CA"
        root = a_context.request.get(base + "/", max_redirects=0)
        assert root.status == 307 and root.headers["location"] == "/fr-CA/"
        document(settings, "/he/settings/user", private=True)
        expect(settings.locator("#settings-preferred-locale")).to_have_value("fr-CA")
        assert settings.locator("html").get_attribute("dir") == "rtl"
        assert sql('select locale from "user" where id=$1', [b_id])[0]["locale"] is None
        record("user-locale-real-DB-root-preference-and-explicit-URL-priority")

        document(settings, "/en/settings/user", private=True)
        settings.emulate_media(color_scheme="dark")
        expect(settings.locator("html")).to_have_attribute("data-theme", "dark")
        expect(settings.locator('input[name="themePreference"][value="system"]')).to_be_checked()
        tab = a_context.new_page()
        tab.set_default_timeout(20000)
        tab.on("pageerror", lambda error: page_errors.append(str(error)))
        document(tab, "/en/settings/user", private=True)
        settings.locator('input[name="themePreference"][value="light"]').check()
        expect(settings.locator("html")).to_have_attribute("data-theme", "light")
        expect(tab.locator('input[name="themePreference"][value="light"]')).to_be_checked()
        assert settings.evaluate("localStorage.getItem('vico-theme')") == "light"
        tab.locator(".theme-toggle").click()
        expect(settings.locator('input[name="themePreference"][value="dark"]')).to_be_checked()
        settings.locator('input[name="themePreference"][value="system"]').check()
        assert settings.evaluate("localStorage.getItem('vico-theme')") is None
        settings.emulate_media(color_scheme="light")
        expect(settings.locator("html")).to_have_attribute("data-theme", "light")
        settings.reload(wait_until="networkidle")
        expect(settings.locator('input[name="themePreference"][value="system"]')).to_be_checked()
        record("theme-system-manual-header-OS-tabs-and-reload")

        topic_id = topic_fixture(a_id)
        topic = a_context.new_page()
        topic.set_default_timeout(20000)
        topic.on("pageerror", lambda error: page_errors.append(str(error)))
        document(topic, "/en/topics/" + quote(topic_id, safe=""))
        expect(topic.locator(".forum-code-block")).to_have_count(1)
        expect(topic.locator(".markdown-editor")).to_have_count(1)
        editor = topic.locator(".markdown-editor")
        block = topic.locator(".forum-code-block")
        expect(editor).to_have_attribute("data-authoring", "simple")
        if settings.locator("#settings-editor-mode").count() != 1:
            diagnostic = {
                "settingsUrl": settings.url,
                "topicUrl": topic.url,
                "settingsTitle": settings.title(),
                "settingsBody": settings.locator("body").inner_text()[:1000],
                "settingsMainCount": settings.locator("main").count(),
                "authUserCount": settings.locator(".auth-user").count(),
                "modeCount": settings.locator("#settings-editor-mode").count(),
                "topicEditorCount": topic.locator(".markdown-editor").count(),
            }
            print("SET03_EDITOR_MISSING " + json.dumps(diagnostic, ensure_ascii=False), flush=True)
            settings.screenshot(path=str(args.output / "missing-settings-editor.png"), full_page=True)
        mode = settings.locator("#settings-editor-mode")
        spell = settings.locator("#settings-editor-spellcheck")
        wrap = settings.locator(".settings-editor-checkbox input").nth(0)
        lines = settings.locator(".settings-editor-checkbox input").nth(1)
        mode.select_option("advanced")
        expect(editor).to_have_attribute("data-authoring", "advanced")
        source = topic.locator("textarea#reply-body")
        source.fill("Never submitted **source**")
        source.evaluate("(element) => element.setSelectionRange(6,6)")
        spell.select_option("true")
        expect(source).to_have_attribute("spellcheck", "true")
        wrap.check()
        lines.check()
        expect(block).to_have_attribute("data-wrap", "true")
        expect(block.locator("pre")).to_have_attribute("data-line-numbers", "true")
        stored = settings.evaluate("""(id) => Object.fromEntries(
          ['mode','spellcheck','code-wrap','code-lines']
          .map(key => [key, localStorage.getItem('vico:editor:'+key+':'+id)]))""", a_id)
        assert stored == {"mode": "advanced", "spellcheck": "true",
                          "code-wrap": "true", "code-lines": "true"}, stored
        editor.get_by_role("button", name="Simple", exact=True).click()
        expect(mode).to_have_value("simple")
        block.get_by_role("button", name="No wrap").click()
        expect(wrap).not_to_be_checked()
        assert sql("select count(*)::int n from forum_posts where topic_id=$1", [topic_id])[0]["n"] == 1
        record("mounted-Editor-code-two-way-preferences-without-unrequested-publication")

        document(other, "/en/settings/user", private=True)
        expect(other.locator("#settings-editor-mode")).to_have_value("default")
        expect(other.locator("#settings-editor-spellcheck")).to_have_value("auto")
        expect(other.locator(".settings-editor-checkbox input").nth(0)).not_to_be_checked()
        assert other.evaluate("localStorage.getItem('vico-theme')") is None
        record("different-account-preference-isolation")

        for locale, direction in (("en", "ltr"), ("ru", "ltr"), ("he", "rtl")):
            for width in (320, 768, 1280):
                settings.set_viewport_size({"width": width, "height": 900})
                document(settings, "/" + locale + "/settings/user", private=True)
                assert settings.locator("html").get_attribute("dir") == direction
                expect(settings.locator("#settings-editor-mode")).to_be_enabled()
                expect(settings.locator("#settings-preferred-locale")).to_be_enabled()
                width_now, document_width = settings.evaluate(
                    "[innerWidth, document.documentElement.scrollWidth]")
                assert document_width <= width_now + 1, (locale, width_now, document_width)
                if width == 320:
                    settings.screenshot(path=str(args.output / (locale + "-320.png")), full_page=True)
            record("responsive-keyboard-controls-RTL", locale=locale)
        settings.locator("#settings-editor-mode").focus()
        settings.keyboard.press("ArrowDown")
        expect(settings.locator("#settings-editor-mode")).to_be_focused()

        # SET03-LEV-01: one browser/cookie jar, a mounted Settings route, actual
        # Better Auth sign-out/in and SPA revalidation; no new account gets the
        # previous actor's unsaved locale draft.
        alice_reset = post(a_context, [
            ("intent", "save-locale"), ("locale", "en"), ("expectedUserId", a_id)])
        bob_initial = post(b_context, [
            ("intent", "save-locale"), ("locale", "he"), ("expectedUserId", b_id)])
        assert (alice_reset.status, bob_initial.status) == (303, 303)
        document(settings, "/en/settings/user", private=True)
        original_select = settings.locator("#settings-preferred-locale")
        expect(original_select).to_have_value("en")
        original_select.select_option("ru")  # Alice's unsaved draft
        settings.locator(".language-switcher select").select_option("he")
        settings.wait_for_url("**/he/settings/user")
        expect(settings.locator("#settings-preferred-locale")).to_have_value("ru")
        assert sql('select locale from "user" where id=$1', [a_id])[0]["locale"] == "en"
        settings.evaluate("""() => {
          window.__set03SettingsShell = document.querySelector('.settings-theme-fieldset');
          window.__set03OldLocaleSelect = document.querySelector('#settings-preferred-locale');
        }""")

        signout = a_context.request.post(base + "/api/auth/sign-out", headers={"Origin": base})
        assert signout.status == 200, ("sign-out", signout.status, signout.text()[:150])
        signin = a_context.request.post(base + "/api/auth/sign-in/email", headers={"Origin": base},
            data={"email": prefix + "-bob@test.invalid",
                  "password": "synthetic-browser-password-123456"})
        assert signin.status == 200, ("sign-in Bob", signin.status, signin.text()[:150])
        settings.locator(".language-switcher select").select_option("ru")
        settings.wait_for_url("**/ru/settings/user")
        expect(settings.locator(".auth-user")).to_contain_text("SET03 bob")
        expect(settings.locator('.settings-locale-form input[name="expectedUserId"]')).to_have_value(b_id)
        expect(settings.locator("#settings-preferred-locale")).to_have_value("he")
        assert settings.evaluate("""() => window.__set03SettingsShell ===
            document.querySelector('.settings-theme-fieldset')"""), "Settings route must stay mounted"
        assert not settings.evaluate("""() => window.__set03OldLocaleSelect ===
            document.querySelector('#settings-preferred-locale')"""), "account-scoped select must reset"
        assert sql('select locale from "user" where id=$1', [a_id])[0]["locale"] == "en"
        assert sql('select locale from "user" where id=$1', [b_id])[0]["locale"] == "he"
        settings.locator("#settings-preferred-locale").select_option("ru")
        settings.locator(".settings-locale-form button[type='submit']").click()
        settings.wait_for_url("**/ru/settings/user?localeSaved=1")
        assert sql('select locale from "user" where id=$1', [a_id])[0]["locale"] == "en"
        assert sql('select locale from "user" where id=$1', [b_id])[0]["locale"] == "ru"
        record("same-mounted-account-switch-discards-old-unsaved-locale")

        assert not page_errors, page_errors
        assert not external, external
        record("set03-real-browser-acceptance-passed")
        browser.close()
finally:
    (args.output / "results.json").write_text(json.dumps({
        "implementationHead": os.environ.get("IMPLEMENTATION_SHA"),
        "cases": records, "pageErrors": page_errors, "externalRequests": external,
    }, ensure_ascii=False, indent=2))
