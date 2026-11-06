import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('erp_user') || 'null');
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('erp_token'));
  const [booting, setBooting] = useState(Boolean(localStorage.getItem('erp_token')));

  const logout = useCallback(() => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      if (!localStorage.getItem('erp_token')) {
        setBooting(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        if (!mounted) return;
        setUser(data.user);
        localStorage.setItem('erp_user', JSON.stringify(data.user));
      } catch {
        if (mounted) logout();
      } finally {
        if (mounted) setBooting(false);
      }
    };
    bootstrap();
    const onUnauthorized = () => logout();
    window.addEventListener('erp:unauthorized', onUnauthorized);
    return () => {
      mounted = false;
      window.removeEventListener('erp:unauthorized', onUnauthorized);
    };
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('erp_token', data.token);
    localStorage.setItem('erp_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
    localStorage.setItem('erp_user', JSON.stringify(nextUser));
  }, []);

  const isAdmin = user?.role === 'admin';

  const value = useMemo(
    () => ({ user, token, booting, login, logout, isAdmin, updateUser }),
    [user, token, booting, login, logout, isAdmin, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
