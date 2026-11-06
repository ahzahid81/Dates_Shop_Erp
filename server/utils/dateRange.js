const { localDateKey } = require('./sequence');

const offset = '+03:00';

const dayRange = (dateStr) => {
  const base = dateStr || localDateKey();
  const start = new Date(`${base}T00:00:00${offset}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

const monthRange = (monthStr) => {
  const base = monthStr || localDateKey().slice(0, 7);
  const start = new Date(`${base}-01T00:00:00${offset}`);
  const [year, month] = base.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = new Date(
    `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00${offset}`
  );
  return { start, end };
};

const dateRangeFromQuery = (from, to) => {
  const start = from ? new Date(`${from}T00:00:00${offset}`) : new Date(0);
  const end = to ? new Date(`${to}T00:00:00${offset}`) : new Date();
  if (to) end.setTime(end.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

const shiftDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

module.exports = { dayRange, monthRange, dateRangeFromQuery, shiftDays, offset };
