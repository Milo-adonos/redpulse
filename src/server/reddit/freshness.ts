/** Live Reddit JSON / OAuth — strict recency */
export const MAX_POST_AGE_DAYS = 21;

/** PullPush archive fallback — data is often months old but still usable */
export const ARCHIVE_MAX_POST_AGE_DAYS = 730;

export const MAX_POST_AGE_MS = MAX_POST_AGE_DAYS * 24 * 60 * 60 * 1000;
export const ARCHIVE_MAX_POST_AGE_MS =
  ARCHIVE_MAX_POST_AGE_DAYS * 24 * 60 * 60 * 1000;

export function getMaxPostAgeUnix(): number {
  return Math.floor((Date.now() - MAX_POST_AGE_MS) / 1000);
}

export function getArchiveMaxPostAgeUnix(): number {
  return Math.floor((Date.now() - ARCHIVE_MAX_POST_AGE_MS) / 1000);
}

export function getMaxPostAgeDate(): Date {
  return new Date(Date.now() - MAX_POST_AGE_MS);
}

export function getMaxPostAgeIsoDate(): string {
  return getMaxPostAgeDate().toISOString().slice(0, 10);
}

export function isWithinMaxPostAge(
  createdUtc: number | null | undefined,
): boolean {
  if (!createdUtc || createdUtc <= 0) return false;
  return createdUtc >= getMaxPostAgeUnix();
}

export function isWithinArchivePostAge(
  createdUtc: number | null | undefined,
): boolean {
  if (!createdUtc || createdUtc <= 0) return true;
  return createdUtc >= getArchiveMaxPostAgeUnix();
}

export function redditDateFromUnix(createdUtc: number): Date {
  return new Date(createdUtc * 1000);
}
