import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const DEFAULT_FAVICON = "/logo.svg";

/**
 * Applies the admin-uploaded favicon to the whole application. Mounted once
 * in `main.tsx` so every route (public pages, winners, admin login, admin
 * panel, display) picks it up. Falls back to the bundled college logo when
 * no custom favicon exists.
 */
export function DynamicFavicon() {
  const state = useQuery(api.settings.publicState);
  const faviconUrl = state?.faviconUrl ?? null;

  useEffect(() => {
    const url = faviconUrl ?? DEFAULT_FAVICON;
    let link = document.querySelector<HTMLLinkElement>(
      "link[rel~='icon']",
    );
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (link.href !== url) link.href = url;
  }, [faviconUrl]);

  return null;
}

export default DynamicFavicon;
