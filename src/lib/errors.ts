import { ConvexError } from "convex/values";

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

/**
 * Convex failures reach the browser as a multi-line hybrid stack trace:
 *
 *   [CONVEX M(voting:castVote)] [Request ID: …] Server Error
 *   Uncaught Error: Voting is not open right now.
 *       at handler (…)
 *     Called by client
 *
 * On a production deployment the real message is redacted, so the only thing
 * left is `[Request ID: …] Server Error` / `Called by client`. These lines are
 * Convex internals and must never be shown to a user, so every extractor below
 * rejects them.
 */
function isInternalNoise(line: string): boolean {
  return (
    !line ||
    line === "Called by client" ||
    /^\[CONVEX\b/.test(line) ||
    /^\[Request ID:/.test(line) ||
    /\bRequest ID\b/.test(line) ||
    /^Server Error$/.test(line) ||
    /^Uncaught (Error|Exception)$/.test(line) ||
    line.startsWith("at ") ||
    /^https?:\/\//.test(line)
  );
}

/** Pull a human-readable string out of a ConvexError payload. */
function fromPayload(data: unknown): string | null {
  if (typeof data === "string") return data.trim() || null;
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return null;
}

/** Only ConvexError text is intended for users (and survives on production). */
function convexErrorPayload(error: unknown): unknown {
  if (error instanceof ConvexError) return (error as { data?: unknown }).data;
  // Defensive fallback in case two copies of the values module are loaded.
  if (
    error &&
    typeof error === "object" &&
    (error as { name?: string }).name === "ConvexError"
  ) {
    return (error as { data?: unknown }).data;
  }
  return undefined;
}

/**
 * Convex wraps server errors in a multi-line trace. Pull the human-readable
 * message out so toasts show the real validation error, not the stack — and
 * fall back to a friendly sentence rather than leaking anything technical.
 */
export function errorMessage(
  error: unknown,
  fallback = DEFAULT_MESSAGE,
): string {
  const payload = fromPayload(convexErrorPayload(error));
  if (payload) return payload;

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (!raw.trim()) return fallback;

  const patterns = [
    /Caused by:\s*(?:[A-Za-z]*Error:\s*)?([^\n]+)/,
    /(?:Uncaught )?(?:[A-Za-z]*Error|TypeError|ConvexError):\s*([^\n]+)/,
  ];
  for (const pattern of patterns) {
    const captured = raw.match(pattern)?.[1]?.trim();
    if (captured && !isInternalNoise(captured)) return captured;
  }

  const firstMeaningful = raw
    .split("\n")
    .map((line) => line.trim())
    .find((line) => !isInternalNoise(line));
  return firstMeaningful || fallback;
}
