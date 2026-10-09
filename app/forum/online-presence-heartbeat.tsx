import { useEffect } from "react";
import { useParams } from "react-router";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { forumPresencePath } from "./paths";

/** Only the routed app mounts this: static Pages fixtures never send heartbeats. */
export function OnlinePresenceHeartbeat() {
  const user = useHeaderAuthUser();
  const { locale = "en" } = useParams();
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
      }).catch(() => { /* Presence is supplemental; never block browsing. */ });
    };
    ping();
    const timer = window.setInterval(ping, 60_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [locale, user?.id]);
  return null;
}
