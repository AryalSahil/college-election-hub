import type { AppearanceSettings } from "@/convex/settings";

/**
 * The one source of truth for how person portraits render on public pages.
 * Every candidate / winner / office-bearer photo across voting, results and
 * the winners page goes through `personLayoutClasses`, so the admin toggles
 * in Settings → Appearance & Display change everything at once. Branding
 * images (college logo, favicon) deliberately do NOT use this component.
 */
export const PERSON_SIZE: Record<
  AppearanceSettings["personImageSize"],
  { px: number; box: string; mobile: string }
> = {
  small: { px: 40, box: "h-10 w-10", mobile: "h-8 w-8" },
  medium: { px: 56, box: "h-14 w-14", mobile: "h-11 w-11" },
  large: { px: 80, box: "h-20 w-20", mobile: "h-16 w-16" },
};

export const PERSON_ROUNDED: Record<
  AppearanceSettings["personImageLayout"],
  string
> = {
  grid: "rounded-md",
  compact: "rounded-full",
  list: "rounded-md",
};

export type PersonImage = {
  name: string;
  photoUrl?: string | null;
};

/**
 * Intrinsic dimensions for a person portrait on a public page.
 * Returns null when photos are disabled — callers must render no image
 * container at all, not an empty box.
 */
export function personImageProps(
  appearance: AppearanceSettings | undefined,
  person: PersonImage,
): {
  size: number;
  sizeClass: string;
  roundedClass: string;
} | null {
  if (!appearance?.showPersonPhotos) return null;
  const size = PERSON_SIZE[appearance.personImageSize];
  return {
    size: size.px,
    sizeClass: `${size.mobile} ${size.box}`,
    roundedClass: PERSON_ROUNDED[appearance.personImageLayout],
  };
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
