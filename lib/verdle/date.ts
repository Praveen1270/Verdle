const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatUtcWeekdayMonthDay(dateIso: string): string {
  // dateIso expected: YYYY-MM-DD
  const d = new Date(`${dateIso}T00:00:00.000Z`);
  const wd = WEEKDAYS[d.getUTCDay()] ?? "";
  const m = MONTHS[d.getUTCMonth()] ?? "";
  const day = d.getUTCDate();
  return `${wd}, ${m} ${day}`;
}

