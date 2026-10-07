/**
 * Convex wraps server errors in a multi-line trace. Pull the human-readable
 * message out so toasts show the real validation error, not the stack.
 */
export function errorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (!raw.trim()) return fallback;

  const patterns = [
    /Caused by:\s*(?:[A-Za-z]*Error:\s*)?([^\n]+)/,
    /Uncaught (?:[A-Za-z]*Error|TypeError):\s*([^\n]+)/,
    /\[Request ID:[^\]]*\]\s*(?:Server Error|Uncaught Error:)\s*([^\n]*)/,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  const firstMeaningful = raw
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        line &&
        !line.startsWith("at ") &&
        !line.includes("Request ID") &&
        !/^https?:\/\//.test(line),
    );
  return firstMeaningful || fallback;
}
