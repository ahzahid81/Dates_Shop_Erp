import { useI18n } from '../context/I18nContext';

const classes = {
  completed: 'badge-green',
  active: 'badge-green',
  paid: 'badge-green',
  accepted: 'badge-green',
  sent: 'badge-blue',
  draft: 'badge-slate',
  partial: 'badge-amber',
  void: 'badge-red',
  rejected: 'badge-red',
  inactive: 'badge-slate',
  expired: 'badge-amber',
  low: 'badge-amber',
  out: 'badge-red',
};

export default function StatusBadge({ status, children }) {
  const { t } = useI18n();
  const key = String(status || '').toLowerCase();
  const labelMap = {
    completed: 'sales.statusCompleted',
    void: 'sales.statusVoid',
    draft: 'quotations.draft',
    sent: 'quotations.sent',
    accepted: 'quotations.accepted',
    rejected: 'quotations.rejected',
    expired: 'quotations.expired',
    active: 'users.active',
    inactive: 'users.inactive',
    paid: 'invoices.paidStatus',
    partial: 'invoices.partialStatus',
    unpaid: 'invoices.unpaidStatus',
    low: 'stock.low',
  };
  return (
    <span className={classes[key] || 'badge-slate'}>
      {children || (labelMap[key] ? t(labelMap[key]) : status)}
    </span>
  );
}
