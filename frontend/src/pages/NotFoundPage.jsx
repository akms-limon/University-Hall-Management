import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";

function NotFoundPage() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="max-w-md w-full rounded-3xl border border-slate-700/60 bg-bg-card/80 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">404</p>
        <h1 className="mt-2 text-2xl font-display font-bold">Page not found</h1>
        <p className="mt-3 text-sm text-slate-400">This route does not exist in the current frontend foundation.</p>
        <Link to="/" className="inline-block mt-6">
          <Button>Go to Landing Page</Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;

