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
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      void fetch(path, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "intent=heartbeat",
      }).then((response) => {
        // The first heartbeat may land after the homepage SSR snapshot.
        if (response.ok && location.pathname === forumIndexPath(locale)) revalidator.revalidate();
      }).catch(() => { /* Presence is supplemental; never block browsing. */ });
    };
    ping();
    const timer = window.setInterval(ping, 60_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [locale, location.pathname, revalidator.revalidate, user?.id]);
  return null;
}
