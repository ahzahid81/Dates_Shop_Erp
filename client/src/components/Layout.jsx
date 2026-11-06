import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpenCheck,
  Boxes,
  Calculator,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  Percent,
  Receipt,
  ShoppingCart,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { dateInput, TIME_ZONE } from '../lib/format';

const groups = [
  {
    key: 'nav.management',
    adminOnly: true,
    items: [{ to: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard }],
  },
  {
    key: 'nav.management',
    employeeOnly: true,
    items: [{ to: '/employee', key: 'nav.employeeHome', icon: LayoutDashboard }],
  },
  {
    key: 'nav.management',
    items: [
      { to: '/sales/new', key: 'nav.newSale', icon: ShoppingCart },
      { to: '/sales', key: 'nav.sales', icon: Receipt, adminOnly: true },
      { to: '/invoices', key: 'nav.invoices', icon: FileText, adminOnly: true },
      { to: '/quotations', key: 'nav.quotations', icon: FileSpreadsheet, adminOnly: true },
      { to: '/products', key: 'nav.products', icon: Package, adminOnly: true },
      { to: '/stock', key: 'nav.stock', icon: Boxes, adminOnly: true },
    ],
  },
  {
    key: 'nav.finance',
    items: [
      { to: '/expenses', key: 'nav.expenses', icon: BookOpenCheck },
      { to: '/summaries/daily', key: 'nav.daily', icon: CalendarDays, adminOnly: true },
      { to: '/summaries/monthly', key: 'nav.monthly', icon: BarChart3, adminOnly: true },
      { to: '/cash', key: 'nav.cash', icon: Wallet, adminOnly: true },
      { to: '/profit', key: 'nav.profit', icon: Percent, adminOnly: true },
      { to: '/statements', key: 'nav.statements', icon: ClipboardList, adminOnly: true },
    ],
  },
  {
    key: 'nav.people',
    adminOnly: true,
    items: [
      { to: '/users', key: 'nav.users', icon: Users, adminOnly: true },
      { to: '/audit-logs', key: 'nav.audit', icon: Calculator, adminOnly: true },
    ],
  },
];

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { t, lang, toggleLang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
    setUserMenu(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleGroups = groups
    .filter((group) => {
      if (group.adminOnly && !isAdmin) return false;
      if (group.employeeOnly && isAdmin) return false;
      return group.items.some((item) => (item.adminOnly ? isAdmin : true));
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => (item.adminOnly ? isAdmin : true)),
    }));

  const sideContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-4">
        <Logo dark />
        <button
          type="button"
          className="icon-btn text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {visibleGroups.map((group, index) => (
          <div key={`${group.key}-${index}`}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {t(group.key)}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/sales/new' ? false : undefined}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : ''}`
                  }
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">{t(item.key)}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-teal-600 text-xs font-bold text-white">
            {user?.name?.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{user?.name}</p>
            <p className="truncate text-[10px] capitalize text-slate-400">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="icon-btn h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white"
            title={t('common.logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 -translate-x-full bg-ink-900 bg-gradient-to-b from-ink-900 via-ink-900 to-ink-800 transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : ''
        } ${collapsed ? 'lg:-translate-x-full' : ''}`}
      >
        {sideContent}
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <div className={`flex min-h-screen flex-col transition-all duration-300 ${collapsed ? 'lg:pl-0' : 'lg:pl-72'}`}>
        <header className="app-header sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="icon-btn lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="icon-btn hidden lg:inline-flex"
              onClick={() => setCollapsed((prev) => !prev)}
              title="Toggle sidebar"
            >
              <PanelLeftClose className={`h-5 w-5 transition ${collapsed ? 'rotate-180' : ''}`} />
            </button>
            <div className="hidden sm:block">
              <p className="text-[11px] font-medium text-slate-400">
                {new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
                  timeZone: TIME_ZONE,
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggleLang}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              title={t('common.language')}
            >
              <span className={lang === 'en' ? 'text-brand-600' : 'text-slate-400'}>EN</span>
              <span className="text-slate-300">/</span>
              <span className={lang === 'bn' ? 'text-brand-600' : 'text-slate-400'}>বাং</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenu((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 py-1 pl-1 pr-2 transition hover:bg-slate-50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-teal-700 text-[10px] font-bold text-white">
                  {user?.name?.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden max-w-[120px] truncate text-xs font-semibold text-slate-700 sm:block">
                  {user?.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {userMenu && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setUserMenu(false)}
                    aria-label="Close menu"
                  />
                  <div className="absolute right-0 z-40 mt-2 w-56 animate-fadeIn rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft">
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
                      <p className="truncate text-xs text-slate-500">{user?.email}</p>
                      <span className="mt-1.5 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                        {user?.role}
                      </span>
                    </div>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('common.logout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="print-shell mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="page-enter">{children}</div>
        </main>

        <footer className="no-print px-4 pb-5 text-center text-[11px] text-slate-400 sm:px-6">
          {t('common.appName')} — {dateInput().slice(0, 4)}
        </footer>
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="fixed left-3 top-20 z-30 hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-soft lg:flex"
          title="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
