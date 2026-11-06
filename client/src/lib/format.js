export const CURRENCY = 'SAR';
export const CURRENCY_LABEL = 'Saudi Riyal';
export const TIME_ZONE = 'Asia/Riyadh';

export const formatMoney = (value, withSymbol = true) => {
  const number = Number(value) || 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
  return withSymbol ? `${CURRENCY} ${formatted}` : formatted;
};

export const formatNumber = (value) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value) || 0);

export const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-GB', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const dateInput = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export const toInputDate = (value = new Date()) => dateInput(value);

export const todayInput = () => dateInput();

export const monthInput = (value = new Date()) => dateInput(value).slice(0, 7);

export const startOfMonthInput = () => `${dateInput().slice(0, 7)}-01`;

export const percent = (value) => `${Number(value || 0).toFixed(1)}%`;

export const downloadBlob = (data, filename, type = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const paymentLabel = (method) => {
  const labels = {
    cash: 'Cash',
    bkash: 'bKash',
    card: 'Card',
    bank: 'Bank',
    credit: 'Credit',
  };
  return labels[method] || method || '-';
};
