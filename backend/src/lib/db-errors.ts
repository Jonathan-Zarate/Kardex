export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const candidate = error as { code?: unknown; cause?: unknown }
  return candidate.code === '23505'
    || (candidate.cause !== undefined && isUniqueViolation(candidate.cause))
}
