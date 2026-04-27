import { Navigate } from 'react-router-dom';
import { useAuth } from '../common/auth/AuthContext';

/**
 * Role-aware redirect mounted at `/`. Managers land on `/plan`; everyone else
 * on `/tasks`. Always rendered inside `<ProtectedRoute>`, so `user` is guaranteed.
 */
export function HomeRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const target = user.role === 'Manager' ? '/plan' : '/tasks';
  return <Navigate to={target} replace />;
}
