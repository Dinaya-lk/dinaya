import { addDays, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export const DEFAULT_BUSINESS_TIMEZONE = "Asia/Colombo";

/** Inclusive start / exclusive end of the local calendar day in UTC. */
export function zonedDayRange(now: Date, timezone = DEFAULT_BUSINESS_TIMEZONE) {
  const tz = timezone.trim() || DEFAULT_BUSINESS_TIMEZONE;
  const localNow = toZonedTime(now, tz);
  const localStart = startOfDay(localNow);
  return {
    start: fromZonedTime(localStart, tz),
    end: fromZonedTime(addDays(localStart, 1), tz),
  };
}
