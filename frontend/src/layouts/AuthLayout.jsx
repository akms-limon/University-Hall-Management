import { Sparkles } from "lucide-react";
import { Outlet } from "react-router-dom";
import { appMeta } from "@/lib/constants";
import UniversityLogo from "@/components/shared/UniversityLogo";

function AuthLayout() {
  return (
    <div className="min-h-screen grid place-items-center p-4 sm:p-6">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-[color:rgb(var(--ui-border)/0.65)] bg-[rgb(var(--bg-card)/0.92)] backdrop-blur-md lg:grid lg:grid-cols-[1fr_1.1fr]">
        <aside className="hidden lg:flex flex-col justify-between border-r border-[color:rgb(var(--ui-border)/0.62)] bg-[rgb(var(--bg-muted)/0.36)] p-8">
          <div>
            <UniversityLogo className="h-12 w-12" fallbackClassName="h-12 w-12" />
            <p className="mt-5 text-xs uppercase tracking-[0.2em] text-[var(--role-accent-text)]">{appMeta.systemLabel}</p>
            <h2 className="mt-3 text-2xl font-display font-semibold leading-tight">{appMeta.hallName}</h2>
            <p className="mt-3 text-sm text-[rgb(var(--text-soft))]">
              Secure role-based access for students, staff, and provost with a unified workflow foundation.
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--role-accent-border)] bg-[var(--role-accent-soft)] p-4 text-sm text-[rgb(var(--text-base))]">
            <Sparkles size={15} className="inline mr-2" />
            Authentication is configured with secure HTTP-only cookie sessions.
          </div>
        </aside>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mb-6 text-center">
            <UniversityLogo className="mx-auto h-24 w-24 sm:h-28 sm:w-28" fallbackClassName="mx-auto h-24 w-24 sm:h-28 sm:w-28" />
            <p className="mt-4 text-base font-display font-semibold leading-tight">{appMeta.hallName}</p>
            <p className="mt-1 text-sm text-slate-400">{appMeta.universityName}</p>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
