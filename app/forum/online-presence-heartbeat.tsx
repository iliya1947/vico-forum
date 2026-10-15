import { useEffect } from "react";
import { useLocation, useParams, useRevalidator } from "react-router";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { forumIndexPath, forumPresencePath } from "./paths";

/** Only the routed app mounts this: static Pages fixtures never send heartbeats. */
export function OnlinePresenceHeartbeat() {
  const user = useHeaderAuthUser();
  const { locale = "en" } = useParams();
  const location = useLocation();
  const revalidator = useRevalidator();
  useEffect(() => {
    if (!user) return;
    const path = forumPresencePath(locale);
    let stopped = false;
    const ping = () => {
      if (stopped || document.visibilityState !== "visible") return;
      void fetch(path, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "intent=heartbeat",
      }).then((response) => {
        if (stopped) return;
        if (response.status === 401) {
          // The header's cached identity can outlive a revoked session in another tab.
          stopped = true;
          window.clearInterval(timer);
          document.removeEventListener("visibilitychange", ping);
          void revalidator.revalidate();
          return;
        }
        // The first heartbeat may land after the homepage SSR snapshot.
        if (response.ok && location.pathname === forumIndexPath(locale)) void revalidator.revalidate();
      }).catch(() => { /* Presence is supplemental; never block browsing. */ });
    };
    ping();
    const timer = window.setInterval(ping, 60_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [locale, location.pathname, revalidator.revalidate, user?.id]);
  return null;
}
