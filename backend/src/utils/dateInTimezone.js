function normalizeDate(dateValue = new Date()) {
  return dateValue instanceof Date ? dateValue : new Date(dateValue);
}

export function getDatePartsInTimezone(dateValue = new Date(), timeZone = "UTC") {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(normalizeDate(dateValue));
  const year = Number(parts.find((entry) => entry.type === "year")?.value);
  const month = Number(parts.find((entry) => entry.type === "month")?.value);
  const day = Number(parts.find((entry) => entry.type === "day")?.value);

  return { year, month, day };
}

export function getDateKeyInTimezone(dateValue = new Date(), timeZone = "UTC") {
  const { year, month, day } = getDatePartsInTimezone(dateValue, timeZone);
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

