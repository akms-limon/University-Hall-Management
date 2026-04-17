import { Navigate, Outlet } from "react-router-dom";
import LoadingState from "@/components/shared/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath } from "@/utils/navigation";

function PublicOnlyRoute() {
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="min-h-screen p-4">
        <LoadingState label="Checking active session..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;
