import { BrowserRouter, Link, Outlet, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ShieldAlert } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider, useI18n } from './context/I18nContext';
import { HomeRedirect, ProtectedRoute, RoleRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Stock from './pages/Stock';
import NewSale from './pages/NewSale';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';
import DailySummary from './pages/DailySummary';
import MonthlySummary from './pages/MonthlySummary';
import Cash from './pages/Cash';
import Profit from './pages/Profit';
import Statements from './pages/Statements';
import Invoices from './pages/Invoices';
import InvoiceView from './pages/InvoiceView';
import Quotations from './pages/Quotations';
import QuotationForm from './pages/QuotationForm';
import QuotationView from './pages/QuotationView';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <ShieldAlert className="h-8 w-8" />
      </span>
      <p className="mt-4 text-5xl font-extrabold tracking-tight text-slate-900">404</p>
      <h1 className="mt-2 text-lg font-bold text-slate-800">{t('notFound.title')}</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{t('notFound.text')}</p>
      <Link to="/" className="btn-primary mt-5">
        {t('notFound.goHome')}
      </Link>
    </div>
  );
}

function AdminRoutes() {
  return (
    <RoleRoute roles={['admin']}>
      <Outlet />
    </RoleRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout>
              <Outlet />
            </Layout>
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="employee" element={<EmployeeDashboard />} />
        <Route path="sales/new" element={<NewSale />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="invoices/:id" element={<InvoiceView />} />

        <Route element={<AdminRoutes />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="stock" element={<Stock />} />
          <Route path="sales" element={<Sales />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="quotations" element={<Quotations />} />
          <Route path="quotations/new" element={<QuotationForm />} />
          <Route path="quotations/:id" element={<QuotationView />} />
          <Route path="quotations/:id/edit" element={<QuotationForm />} />
          <Route path="summaries/daily" element={<DailySummary />} />
          <Route path="summaries/monthly" element={<MonthlySummary />} />
          <Route path="cash" element={<Cash />} />
          <Route path="profit" element={<Profit />} />
          <Route path="statements" element={<Statements />} />
          <Route path="users" element={<Users />} />
          <Route path="audit-logs" element={<AuditLogs />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: '12px',
                background: '#0b1220',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}
