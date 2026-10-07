import { Seal } from "@/components/Seal";

/** College seal + wordmark, used in the public header and admin panel. */
export function Brand({
  className = "",
  markClassName = "size-9",
  subtitle = "Election Portal",
}: {
  className?: string;
  markClassName?: string;
  subtitle?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Seal className={`${markClassName} shrink-0 text-primary`} />
      <div className="leading-tight">
        <div className="text-[13px] font-semibold uppercase tracking-[0.2em]">
          Pragjyotish College
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

export default Brand;
