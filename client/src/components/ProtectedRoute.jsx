import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/States';

export function ProtectedRoute({ children }) {
  const { user, token, booting } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    );
  }
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

export function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) {
    return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/employee'} replace />;
  }
  return children;
}

export function HomeRedirect() {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/dashboard' : '/employee'} replace />;
}
