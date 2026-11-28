declare module "virtual:vico-ui-preview-routes" {
  export const routeManifest: import("../build/route-manifest").PreviewRouteDescriptor;
  export function importRoute(id: string): Promise<Record<string, unknown>>;
}
