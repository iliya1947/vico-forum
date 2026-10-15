export type RequiredHyperdriveBindingName = "HYPERDRIVE" | "WEB_HYPERDRIVE";

interface HyperdriveBindingLike {
  readonly connectionString?: unknown;
}

export interface RuntimeDatabaseBindingsEnvironment {
  readonly HYPERDRIVE?: HyperdriveBindingLike;
  readonly WEB_HYPERDRIVE?: HyperdriveBindingLike;
}

export interface RuntimeDatabaseConnectionStrings {
  readonly localizationConnectionString: string;
  readonly webConnectionString: string;
}

export class RuntimeDatabaseBindingConfigurationError extends Error {
  constructor(readonly bindingName: RequiredHyperdriveBindingName) {
    super(`${bindingName} Hyperdrive binding is not configured`);
    this.name = "RuntimeDatabaseBindingConfigurationError";
  }
}

export function resolveRuntimeDatabaseConnectionStrings(
  env: RuntimeDatabaseBindingsEnvironment,
): RuntimeDatabaseConnectionStrings {
  return {
    localizationConnectionString: requireConnectionString(env.HYPERDRIVE, "HYPERDRIVE"),
    webConnectionString: requireConnectionString(env.WEB_HYPERDRIVE, "WEB_HYPERDRIVE"),
  };
}

function requireConnectionString(
  binding: HyperdriveBindingLike | undefined,
  bindingName: RequiredHyperdriveBindingName,
): string {
  const connectionString = binding?.connectionString;
  if (typeof connectionString !== "string" || !connectionString.trim()) {
    throw new RuntimeDatabaseBindingConfigurationError(bindingName);
  }
  return connectionString;
}
