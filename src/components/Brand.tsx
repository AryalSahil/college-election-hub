import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Seal } from "@/components/Seal";
import { cn } from "@/lib/utils";

/**
 * College mark + wordmark, used in the public header and the admin panel.
 * Renders the admin-uploaded college logo when one exists (from
 * `settings.publicState`), otherwise falls back to the drawn college seal.
 */
export function Brand({
  className = "",
  markClassName = "size-9",
  subtitle = "Election Portal",
  showSubtitle = true,
}: {
  className?: string;
  markClassName?: string;
  subtitle?: string;
  showSubtitle?: boolean;
}) {
  const state = useQuery(api.settings.publicState);
  const collegeName = state?.branding?.collegeName ?? "Pragjyotish College";
  const logoUrl = state?.branding?.logoUrl ?? null;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${collegeName} logo`}
          className={cn("shrink-0 object-contain", markClassName)}
          onError={(event) => {
            // If the stored URL ever fails, hide the broken image and let the
            // wordmark carry the brand rather than showing a broken icon.
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <Seal className={cn("shrink-0 text-primary", markClassName)} />
      )}
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[13px] font-semibold uppercase tracking-[0.2em]">
          {collegeName}
        </div>
        {showSubtitle && (
          <div className="truncate text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

export default Brand;
