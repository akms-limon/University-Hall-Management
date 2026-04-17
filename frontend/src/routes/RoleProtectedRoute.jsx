import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

function RoleProtectedRoute({ allow }) {
  const { user } = useAuth();

  if (!user?.role) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export default RoleProtectedRoute;
