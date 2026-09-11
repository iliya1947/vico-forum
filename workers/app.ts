import { RouterContextProvider, createRequestHandler } from "react-router";
import { registryLoaderContext } from "../app/localization/request-context";
import { createHyperdriveRegistryLoader } from "../db/hyperdrive-registry";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const context = new RouterContextProvider();
    context.set(registryLoaderContext, createHyperdriveRegistryLoader(env.HYPERDRIVE.connectionString));
    return requestHandler(request, context);
  },
} satisfies ExportedHandler<Env>;
