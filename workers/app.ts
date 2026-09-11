import { RouterContextProvider, createRequestHandler } from "react-router";
import { registryLoaderContext, uiTranslationStoreContext } from "../app/localization/request-context";
import { createHyperdriveRegistryLoader } from "../db/hyperdrive-registry";
import { createHyperdriveUiTranslationStore } from "../db/hyperdrive-ui-translations";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const context = new RouterContextProvider();
    const connectionString = env.HYPERDRIVE.connectionString;
    context.set(registryLoaderContext, createHyperdriveRegistryLoader(connectionString));
    context.set(uiTranslationStoreContext, createHyperdriveUiTranslationStore(connectionString));
    return requestHandler(request, context);
  },
} satisfies ExportedHandler<Env>;
