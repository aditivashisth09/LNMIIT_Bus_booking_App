import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const StudentProtectedRoute = () => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role !== 'student') {
    // Redirect admins away from student-only pages
    return <Navigate to="/admin-dashboard" replace />;
  }

  return <Outlet />;
};

export default StudentProtectedRoute;