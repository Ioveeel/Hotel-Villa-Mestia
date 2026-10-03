const NO_OVERLAP_CONSTRAINT = "bookings_no_overlap";

// drizzle wraps driver errors; the pg error is in `cause`
export function isNoOverlapViolation(err: unknown): boolean {
  const pgErr = (err as { cause?: unknown })?.cause ?? err;
  const { code, constraint } = pgErr as { code?: string; constraint?: string };
  return code === "23P01" && constraint === NO_OVERLAP_CONSTRAINT;
}
