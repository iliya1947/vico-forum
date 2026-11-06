import type { ShouldRevalidateFunctionArgs } from "react-router";

/**
 * Failed measure submissions may mean that the server has a newer measure,
 * appeal or effective authorization snapshot. Refresh the loader, not the POST.
 */
export function measureShouldRevalidate({
  actionStatus, formMethod, defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs): boolean {
  if (formMethod?.toUpperCase() === "POST" &&
      (actionStatus === 403 || actionStatus === 404 || actionStatus === 409)) {
    return true;
  }
  return defaultShouldRevalidate;
}
