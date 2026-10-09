import { useState } from "react";
import { safeHttpUrl } from "./profile";

export function ForumAvatar({ name, image, className }: {
  name: string; image?: string | null; className: string;
}) {
  const url = safeHttpUrl(image);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <span className={className} aria-hidden="true">
    {url && url !== failedUrl
      ? <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />
      : Array.from(name.trim())[0]?.toUpperCase() ?? "?"}
  </span>;
}
