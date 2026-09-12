-- Infrastructure configuration, intentionally separate from portable schema migrations.
-- Values are initial bounds and require real staging Hyperdrive calibration.
ALTER ROLE :"runtime_role" IN DATABASE :"database_name" SET lock_timeout = '500ms';
ALTER ROLE :"runtime_role" IN DATABASE :"database_name" SET statement_timeout = '1500ms';
