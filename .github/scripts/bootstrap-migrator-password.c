#include <libpq-fe.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void fail(PGconn *conn, PGresult *res, const char *message) {
    if (res) {
        PQclear(res);
    }
    if (conn) {
        PQfinish(conn);
    }
    fprintf(stderr, "%s\n", message);
    exit(EXIT_FAILURE);
}

static int text_is_true(const char *value) {
    return value && (strcmp(value, "t") == 0 || strcmp(value, "true") == 0);
}

int main(void) {
    const char *owner_url = getenv("NEON_OWNER_DATABASE_URL");
    const char *target_host = getenv("NEON_BOOTSTRAP_TARGET_HOST");
    const char *password = getenv("NEON_MIGRATOR_BOOTSTRAP_PASSWORD");
    const char *target_role = "vico_forum_migrator";
    const char *expected_owner = "vico_forum_owner";
    const char *expected_db = "vico_forum";

    if (!owner_url || !*owner_url || !target_host || !*target_host || !password || !*password) {
        fprintf(stderr, "required bootstrap environment is missing\n");
        return EXIT_FAILURE;
    }

    if (strstr(target_host, "-pooler") != NULL) {
        fprintf(stderr, "refusing pooled target host\n");
        return EXIT_FAILURE;
    }

    const char *owner_keys[] = {
        "dbname", "host", "application_name", "options", "connect_timeout", NULL
    };
    const char *owner_vals[] = {
        owner_url,
        target_host,
        "vico-migrator-bootstrap",
        "-csearch_path=",
        "10",
        NULL
    };

    PGconn *conn = PQconnectdbParams(owner_keys, owner_vals, 1);
    if (!conn || PQstatus(conn) != CONNECTION_OK) {
        fail(conn, NULL, "owner connection to bootstrap target failed");
    }

    if (strcmp(PQhost(conn), target_host) != 0) {
        fail(conn, NULL, "connected host does not match bootstrap target");
    }

    const char *preflight_sql =
        "SELECT current_database(), current_user, "
        "       current_setting('password_encryption'), "
        "       (SELECT pg_get_userbyid(datdba) = current_user FROM pg_database WHERE datname = current_database()), "
        "       r.rolcanlogin, (a.rolpassword IS NULL), "
        "       COALESCE((SELECT m.admin_option AND NOT m.inherit_option AND NOT m.set_option "
        "                 FROM pg_auth_members m "
        "                 JOIN pg_roles gr ON gr.oid = m.roleid "
        "                 JOIN pg_roles mem ON mem.oid = m.member "
        "                 WHERE gr.rolname = 'vico_forum_migrator' AND mem.rolname = current_user), false) "
        "FROM pg_roles r JOIN pg_authid a ON a.oid = r.oid "
        "WHERE r.rolname = 'vico_forum_migrator'";

    PGresult *res = PQexec(conn, preflight_sql);
    if (!res || PQresultStatus(res) != PGRES_TUPLES_OK || PQntuples(res) != 1 || PQnfields(res) != 7) {
        fail(conn, res, "bootstrap preflight query failed");
    }

    if (strcmp(PQgetvalue(res, 0, 0), expected_db) != 0 ||
        strcmp(PQgetvalue(res, 0, 1), expected_owner) != 0 ||
        strcmp(PQgetvalue(res, 0, 2), "scram-sha-256") != 0 ||
        !text_is_true(PQgetvalue(res, 0, 3)) ||
        !text_is_true(PQgetvalue(res, 0, 4)) ||
        !text_is_true(PQgetvalue(res, 0, 5)) ||
        !text_is_true(PQgetvalue(res, 0, 6))) {
        fail(conn, res, "bootstrap preflight invariants failed");
    }
    PQclear(res);

    char *verifier = PQencryptPasswordConn(conn, password, target_role, "scram-sha-256");
    if (!verifier || strncmp(verifier, "SCRAM-SHA-256$", 14) != 0) {
        if (verifier) {
            PQfreemem(verifier);
        }
        fail(conn, NULL, "SCRAM verifier generation failed");
    }

    char *literal = PQescapeLiteral(conn, verifier, strlen(verifier));
    PQfreemem(verifier);
    verifier = NULL;
    if (!literal) {
        fail(conn, NULL, "SCRAM verifier escaping failed");
    }

    const char *prefix = "ALTER ROLE vico_forum_migrator PASSWORD ";
    size_t sql_len = strlen(prefix) + strlen(literal) + 1;
    char *alter_sql = malloc(sql_len);
    if (!alter_sql) {
        PQfreemem(literal);
        fail(conn, NULL, "memory allocation failed");
    }

    snprintf(alter_sql, sql_len, "%s%s", prefix, literal);
    PQfreemem(literal);
    literal = NULL;

    res = PQexec(conn, alter_sql);
    memset(alter_sql, 0, sql_len);
    free(alter_sql);
    alter_sql = NULL;
    if (!res || PQresultStatus(res) != PGRES_COMMAND_OK) {
        fail(conn, res, "ALTER ROLE bootstrap failed");
    }
    PQclear(res);

    res = PQexec(
        conn,
        "SELECT a.rolpassword IS NOT NULL AND a.rolpassword LIKE 'SCRAM-SHA-256$%' "
        "FROM pg_authid a JOIN pg_roles r ON r.oid = a.oid "
        "WHERE r.rolname = 'vico_forum_migrator'"
    );
    if (!res || PQresultStatus(res) != PGRES_TUPLES_OK || PQntuples(res) != 1 ||
        !text_is_true(PQgetvalue(res, 0, 0))) {
        fail(conn, res, "stored SCRAM verifier verification failed");
    }
    PQclear(res);
    PQfinish(conn);
    conn = NULL;

    const char *migrator_keys[] = {
        "dbname",
        "host",
        "user",
        "password",
        "require_auth",
        "application_name",
        "options",
        "connect_timeout",
        NULL
    };
    const char *migrator_vals[] = {
        owner_url,
        target_host,
        target_role,
        password,
        "scram-sha-256",
        "vico-migrator-bootstrap-verify",
        "-csearch_path=",
        "10",
        NULL
    };

    conn = PQconnectdbParams(migrator_keys, migrator_vals, 1);
    if (!conn || PQstatus(conn) != CONNECTION_OK) {
        fail(conn, NULL, "migrator SCRAM login verification failed");
    }

    if (strcmp(PQhost(conn), target_host) != 0 || strcmp(PQuser(conn), target_role) != 0) {
        fail(conn, NULL, "migrator verification connected with unexpected identity or host");
    }

    res = PQexec(
        conn,
        "SELECT current_database(), current_user, "
        "       NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolbypassrls "
        "FROM pg_roles WHERE rolname = current_user"
    );
    if (!res || PQresultStatus(res) != PGRES_TUPLES_OK || PQntuples(res) != 1 || PQnfields(res) != 3 ||
        strcmp(PQgetvalue(res, 0, 0), expected_db) != 0 ||
        strcmp(PQgetvalue(res, 0, 1), target_role) != 0 ||
        !text_is_true(PQgetvalue(res, 0, 2))) {
        fail(conn, res, "migrator post-bootstrap invariants failed");
    }

    PQclear(res);
    PQfinish(conn);
    puts("migrator bootstrap verification succeeded");
    return EXIT_SUCCESS;
}
