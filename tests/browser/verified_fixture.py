"""Disposable PostgreSQL fixtures for connected browser scenarios.

Only scenarios that do not test email verification may use this helper.
Keep actual Worker registration, native credential hashing, and sign-in.
No application endpoint, fabricated cookie, or provider call is added.
"""
import os
from urllib.parse import urlparse


def assert_disposable(sql, base):
    url = urlparse(os.environ.get("DATABASE_URL", ""))
    assert url.hostname in ("localhost", "127.0.0.1") and url.path.endswith("_test")
    assert urlparse(base).hostname in ("localhost", "127.0.0.1")
    assert sql("select current_database() db,current_schema() schema") == [
        {"db": url.path[1:], "schema": "public"}
    ], "Expected the connected disposable PostgreSQL database"


def mark_verified_fixture(sql, base, email):
    """Only a real pending credential with an issued proof and no session."""
    assert_disposable(sql, base)
    rows = sql("""with pending as (
      select u.id, v.id proof_id from "user" u join verification v
      on v.id='vico-auth-lifecycle:v1:email-verification:' || encode(sha256(convert_to(u.id,'UTF8')),'hex')
      and v.identifier=v.id
      where u.email=$1 and not u.email_verified and u.deactivated_at is null
      and exists(select 1 from account a where a.user_id=u.id and a.provider_id='credential'
        and a.password is not null and a.password<>'')
      and not exists(select 1 from session s where s.user_id=u.id)
    ), verified as (
      update "user" u set email_verified=true from pending p where u.id=p.id
      returning u.id, p.proof_id
    ), consumed as (
      delete from verification v using verified x where v.id=x.proof_id and v.identifier=x.proof_id
      returning x.id
    ) select id from consumed""", [email.lower()])
    assert len(rows) == 1, "Expected exactly one pending credential fixture and proof"
    return rows[0]["id"]


def signup_verified_session(sql, request, base, *, headers, data):
    assert_disposable(sql, base)
    email = data["email"]
    assert not sql('select id from "user" where email=$1', [email.lower()])
    # Fixture provisioning is not an abuse test. Local Worker requests may
    # share the same unknown ingress bucket; isolate these setup operations.
    # Actual registration-policy/verification/budget probes do not use this reset.
    sql("truncate auth_lifecycle_budget")
    pending = request.post(base + "/api/auth/sign-up/email", headers=headers, data=data)
    assert pending.status == 200, ("pending signup", pending.status, pending.text()[:180])
    assert pending.json() == {"status": True, "token": None}
    assert not any("session_token=" in value["value"] for value in pending.headers_array
                   if value["name"].lower() == "set-cookie")
    user_id = mark_verified_fixture(sql, base, email)
    login = request.post(base + "/api/auth/sign-in/email", headers=headers,
                         data={"email": email, "password": data["password"]})
    assert login.status == 200, ("fixture sign-in", login.status, login.text()[:180])
    user = login.json()["user"]
    assert user["id"] == user_id and user["emailVerified"] is True
    assert any("session_token=" in value["value"] for value in login.headers_array
               if value["name"].lower() == "set-cookie")
    return login
