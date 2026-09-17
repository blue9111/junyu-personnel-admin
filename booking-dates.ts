export const MAX_BOOKING_DAYS = 31;

/** Calendar dates in Taiwan; use UTC arithmetic to avoid browser DST shifts. */
export function bookingDates(date: unknown, endDate: unknown = date): string[] {
  const valid = (value: unknown): value is string => typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '0001-01-01' &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!valid(date) || !valid(endDate) || endDate < date) return [];
  const start = Date.parse(`${date}T00:00:00Z`);
  const count = (Date.parse(`${endDate}T00:00:00Z`) - start) / 86400000 + 1;
  if (count > MAX_BOOKING_DAYS) return [];
  return Array.from({ length: count }, (_, i) => new Date(start + i * 86400000).toISOString().slice(0, 10));
}
