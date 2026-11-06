import { useEffect, useState } from 'react';
import { Edit3, ShieldCheck, UserPlus, Users as UsersIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { formatDateTime } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { EmptyState, SkeletonRows } from '../components/States';

const EMPTY = { name: '', email: '', phone: '', role: 'employee', isActive: true, password: '' };

function UserForm({ open, onClose, user, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        user
          ? { name: user.name, email: user.email, phone: user.phone || '', role: user.role, isActive: user.isActive, password: '' }
          : EMPTY
      );
    }
  }, [open, user]);

  const set = (key) => (event) =>
    setForm((prev) => ({
      ...prev,
      [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (user && !payload.password) delete payload.password;
      if (user) {
        await api.put(`/auth/users/${user._id}`, payload);
        toast.success(t('users.accountUpdated'));
      } else {
        await api.post('/auth/users', payload);
        toast.success(t('users.accountCreated'));
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? t('users.editUser') : t('users.addUser')}
      subtitle={t('users.subtitle')}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="user-form" className="btn-primary" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">{t('users.name')}</label>
          <input className="input" value={form.name} onChange={set('name')} required minLength={2} />
        </div>
        <div>
          <label className="label">{t('users.phone')}</label>
          <input className="input" value={form.phone} onChange={set('phone')} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">{t('users.email')}</label>
          <input type="email" className="input" value={form.email} onChange={set('email')} required />
        </div>
        <div>
          <label className="label">{t('users.role')}</label>
          <select className="select" value={form.role} onChange={set('role')}>
            <option value="employee">{t('users.employeeRole')}</option>
            <option value="admin">{t('users.adminRole')}</option>
          </select>
        </div>
        <div>
          <label className="label">
            {user ? t('users.newPassword') : t('users.password')}
          </label>
          <input
            type="password"
            className="input"
            value={form.password}
            onChange={set('password')}
            required={!user}
            minLength={8}
            placeholder={user ? t('users.passwordHint') : ''}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 sm:col-span-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={form.isActive}
            onChange={set('isActive')}
          />
          {t('users.active')}
        </label>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { t } = useI18n();
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, user: null });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.users);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const admins = users.filter((u) => u.role === 'admin').length;
  const active = users.filter((u) => u.isActive).length;

  return (
    <div>
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={
          <button type="button" className="btn-primary" onClick={() => setModal({ open: true, user: null })}>
            <UserPlus className="h-4 w-4" />
            {t('users.addUser')}
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t('users.title')} value={users.length} icon={UsersIcon} tone="brand" />
        <StatCard label={t('users.adminRole')} value={admins} icon={ShieldCheck} tone="violet" />
        <StatCard label={t('users.employeeRole')} value={users.length - admins} icon={UserPlus} tone="sky" />
        <StatCard label={t('users.active')} value={active} icon={UsersIcon} tone="emerald" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
          <h2 className="section-title">{t('users.title')}</h2>
          <span className="badge-slate">{users.length} {t('common.records')}</span>
        </div>
        {loading ? (
          <SkeletonRows rows={5} />
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title={t('users.noUsers')} />
        ) : (
          <>
            <div className="table-wrap hidden md:block">
              <table className="table min-w-[760px]">
                <thead>
                  <tr>
                    <th>{t('users.name')}</th>
                    <th>{t('users.email')}</th>
                    <th>{t('users.role')}</th>
                    <th>{t('users.status')}</th>
                    <th>{t('users.lastLogin')}</th>
                    <th className="text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-teal-700 text-[10px] font-bold text-white">
                            {user.name?.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {user.name} {user._id === me?._id && <span className="text-[10px] text-brand-600">({t('users.you')})</span>}
                            </p>
                            <p className="text-[11px] text-slate-400">{user.phone || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-500">{user.email}</td>
                      <td>
                        <span className={user.role === 'admin' ? 'badge-blue' : 'badge-slate'}>
                          {user.role === 'admin' ? t('users.adminRole') : t('users.employeeRole')}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={user.isActive ? 'active' : 'inactive'} />
                      </td>
                      <td className="text-slate-500">
                        {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : t('users.never')}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setModal({ open: true, user })}
                          title={t('common.edit')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {users.map((user) => (
                <div key={user._id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-teal-700 text-[10px] font-bold text-white">
                      {user.name?.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                      <p className="text-[11px] text-slate-400">{user.email}</p>
                      <div className="mt-1 flex gap-1">
                        <span className={user.role === 'admin' ? 'badge-blue' : 'badge-slate'}>
                          {user.role === 'admin' ? t('users.adminRole') : t('users.employeeRole')}
                        </span>
                        <StatusBadge status={user.isActive ? 'active' : 'inactive'} />
                      </div>
                    </div>
                  </div>
                  <button type="button" className="icon-btn" onClick={() => setModal({ open: true, user })}>
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <UserForm
        open={modal.open}
        user={modal.user}
        onClose={() => setModal({ open: false, user: null })}
        onSaved={load}
      />
    </div>
  );
}
