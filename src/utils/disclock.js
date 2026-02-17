/**
 * Discord timestamp format types
 */
const FORMATS = {
   SHORT_TIME: "t",
   LONG_TIME: "T",
   SHORT_DATE: "d",
   LONG_DATE: "D",
   SHORT_DATE_TIME: "f",
   LONG_DATE_TIME: "F",
   RELATIVE: "R",
};

/**
 * Convert a Date object to Discord timestamp format
 * @param {Date} date - JavaScript Date object
 * @param {string} format - Discord timestamp format (t, T, d, D, f, F, R)
 * @returns {string} Discord timestamp string
 */

function toDiscordTimestamp(date, format = FORMATS.SHORT_DATE_TIME) {
   if (!(date instanceof Date)) {
      throw new Error("First parameter must me Date object");
   }

   if (isNaN(date.getTime())) {
      throw new Error("Invalid Date object provided");
   }

   const validFormats = Object.values(FORMATS);
   if (!validFormats.includes(format)) {
      throw new Error(
         `Invalid format. Valid formats: ${validFormats.join(", ")}`
      );
   }

   const unixTimeStamp = Math.floor(date.getTime() / 1000);

   return `<t:${unixTimeStamp}:${format}>`;
}

module.exports = { FORMATS, toDiscordTimestamp }
