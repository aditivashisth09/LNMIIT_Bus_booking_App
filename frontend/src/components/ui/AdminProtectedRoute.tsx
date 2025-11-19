import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const AdminProtectedRoute = () => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role !== 'admin') {
    // Redirect students away from admin-only pages
    return <Navigate to="/student-dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;