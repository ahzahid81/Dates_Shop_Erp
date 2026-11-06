import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

export default function Pagination({ page, pages, onPage, total }) {
  const { t } = useI18n();
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
      <p className="text-xs text-slate-500">
        {t('common.page') || 'Page'} {page} / {pages}
        {total !== undefined ? ` • ${total}` : ''}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          {t('common.previous') || 'Previous'}
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          {t('common.next') || 'Next'}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
