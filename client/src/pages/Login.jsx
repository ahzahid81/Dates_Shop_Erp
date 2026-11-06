import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Mail,
  PackageCheck,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { getErrorMessage } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, user, booting } = useAuth();
  const { t, lang, toggleLang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!booting && user) {
      navigate(user.role === 'admin' ? '/dashboard' : '/employee', { replace: true });
    }
  }, [user, booting, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const logged = await login(email, password);
      const fallback = logged.role === 'admin' ? '/dashboard' : '/employee';
      const target = location.state?.from?.pathname || fallback;
      navigate(target, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <div className="relative hidden w-1/2 overflow-hidden bg-ink-900 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-800 to-brand-950" />
        <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-28 -left-16 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative z-10 p-10 xl:p-14">
          <Logo dark />
          <div className="mt-16 max-w-lg xl:mt-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-brand-200">
              <BadgeCheck className="h-3.5 w-3.5" />
              {t('login.secure')}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.12] tracking-tight text-white xl:text-5xl">
              {t('login.heroTitle')}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">{t('login.heroText')}</p>

            <div className="mt-9 grid max-w-md grid-cols-1 gap-3">
              {[
                { icon: PackageCheck, text: t('login.feature1') },
                { icon: BarChart3, text: t('login.feature2') },
                { icon: FileText, text: t('login.feature3') },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-slate-200">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-white/10 p-10 xl:p-14">
          <div className="flex items-center gap-8 text-slate-400">
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-4 w-4 text-brand-400" />
              <span>Real-time profit</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Wallet className="h-4 w-4 text-brand-400" />
              <span>Cash tracking</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="h-4 w-4 text-brand-400" />
              <span>Audit logs</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between p-5 sm:p-7">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden lg:block" />
          <button
            type="button"
            onClick={toggleLang}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <span className={lang === 'en' ? 'text-brand-600' : 'text-slate-400'}>EN</span>
            <span className="text-slate-300">/</span>
            <span className={lang === 'bn' ? 'text-brand-600' : 'text-slate-400'}>বাং</span>
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
          <div className="w-full max-w-md animate-fadeIn">
            <div className="mb-7">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-600/10">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {t('login.welcomeBack')}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">{t('login.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="card card-pad space-y-4">
              <div>
                <label className="label" htmlFor="email">
                  {t('login.email')}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    className="input pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@shop.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="password">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="input px-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? t('login.signingIn') : t('login.signIn')}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Role-based access • Encrypted passwords • Audit trail
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
