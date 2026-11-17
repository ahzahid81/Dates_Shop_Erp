import { SHOP } from '../config';
import { useI18n } from '../context/I18nContext';
import { formatDateTime } from '../lib/format';

export default function PrintHeader({ title, meta }) {
  const { t } = useI18n();
  return (
    <div className="mb-5 hidden border-b-2 border-black pb-3 print:block">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-lg font-extrabold uppercase tracking-wide text-black">{SHOP.name}</p>
          {SHOP.legalName !== SHOP.name && (
            <p className="text-[10px] uppercase tracking-wider text-black">{SHOP.legalName}</p>
          )}
          <p className="mt-1 text-[10px] text-black">{SHOP.address}</p>
          <p className="text-[10px] text-black">
            {SHOP.phone} - {SHOP.email}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-extrabold uppercase tracking-wide text-black">{title}</p>
          {meta && <p className="mt-0.5 text-[11px] font-semibold text-black">{meta}</p>}
          <p className="mt-1 text-[10px] text-black">
            {t('print.printedOn')}: {formatDateTime(new Date())}
          </p>
        </div>
      </div>
    </div>
  );
}
