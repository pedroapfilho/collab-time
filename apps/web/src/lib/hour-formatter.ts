import type { CommonTimezone } from "./timezones";

const hourFormatters = new Map<CommonTimezone, Intl.DateTimeFormat>();

const getHourFormatter = (timeZone: CommonTimezone): Intl.DateTimeFormat => {
  let formatter = hourFormatters.get(timeZone);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone,
    });
    hourFormatters.set(timeZone, formatter);
  }
  return formatter;
};

export { getHourFormatter };
