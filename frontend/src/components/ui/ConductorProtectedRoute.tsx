import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const ConductorProtectedRoute = () => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role !== 'conductor') {
    // Redirect non-conductors (e.g., students)
    return <Navigate to="/student-dashboard" replace />;
  }

  return <Outlet />;
};

export default ConductorProtectedRoute;