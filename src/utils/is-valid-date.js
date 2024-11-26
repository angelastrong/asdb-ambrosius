function isDateValid(dateStr) {
    return !isNaN(new Date(dateStr));
  }

module.exports = isDateValid