function formatScheduleDate(date, year = 0) {
    const tempDate = new Date(date);
    tempDate.setFullYear(tempDate.getFullYear() + year);
    const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'short' });
    return formatter.format(tempDate);
}

module.exports = formatScheduleDate