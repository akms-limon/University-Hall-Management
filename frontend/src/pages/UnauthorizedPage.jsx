import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { getHomePath } from "@/utils/navigation";

function UnauthorizedPage() {
  const { isAuthenticated, user } = useAuth();
  const fallbackPath = getHomePath(isAuthenticated, user.role);

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="max-w-md w-full rounded-3xl border border-slate-700/60 bg-bg-card/80 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-red-300">403</p>
        <h1 className="mt-2 text-2xl font-display font-bold">Unauthorized access</h1>
        <p className="mt-3 text-sm text-slate-400">Your current role cannot access this route.</p>
        <Link to={fallbackPath} className="inline-block mt-6">
          <Button>{isAuthenticated ? "Go to Home" : "Back to Login"}</Button>
        </Link>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
