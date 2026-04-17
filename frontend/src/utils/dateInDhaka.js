const DHAKA_TIMEZONE = "Asia/Dhaka";
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function getDatePartsInDhaka(dateValue = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DHAKA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(dateValue instanceof Date ? dateValue : new Date(dateValue));
  const year = Number(parts.find((entry) => entry.type === "year")?.value);
  const month = Number(parts.find((entry) => entry.type === "month")?.value);
  const day = Number(parts.find((entry) => entry.type === "day")?.value);

  return { year, month, day };
}

export function getDateKeyInDhaka(dateValue = new Date()) {
  const { year, month, day } = getDatePartsInDhaka(dateValue);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dateFromDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function addDaysToDateKey(dateKey, days = 0) {
  const date = dateFromDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

export function normalizeDateInputToDhakaKey(value, fallbackDate = new Date()) {
  if (typeof value === "string" && dateKeyPattern.test(value.trim())) {
    return value.trim();
  }

  if (!value) {
    return getDateKeyInDhaka(fallbackDate);
  }

  return getDateKeyInDhaka(value);
}

export function getTomorrowDateKeyInDhaka(baseDate = new Date()) {
  return addDaysToDateKey(getDateKeyInDhaka(baseDate), 1);
}

export function isFutureDateKeyInDhaka(dateKey, baseDate = new Date()) {
  const normalizedDateKey = normalizeDateInputToDhakaKey(dateKey, baseDate);
  return normalizedDateKey > getDateKeyInDhaka(baseDate);
}

export function isTodayDateKeyInDhaka(dateKey, baseDate = new Date()) {
  const normalizedDateKey = normalizeDateInputToDhakaKey(dateKey, baseDate);
  return normalizedDateKey === getDateKeyInDhaka(baseDate);
}

