import { useState } from "react";
import { motion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginSchema } from "@/features/auth/validation";
import AuthField from "@/features/auth/components/AuthField";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath } from "@/utils/navigation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values) => {
    setApiError("");
    try {
      const user = await login(values);
      navigate(location.state?.from ?? getDashboardPath(user.role), { replace: true });
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Failed to sign in."));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <p className="text-xs uppercase tracking-[0.18em] text-indigo-300">Access Workspace</p>
      <h1 className="text-2xl font-display font-bold mt-2">Sign in to your account</h1>
      <p className="text-sm text-slate-400 mt-2">Use your registered credentials to access your role-specific dashboard.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {apiError ? (
          <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{apiError}</div>
        ) : null}

        <AuthField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <AuthField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          hint="Use the password you registered with."
          {...register("password")}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <p className="mt-5 text-sm text-slate-400">
        Need a student account?{" "}
        <Link to="/register" className="text-cyan-300 hover:text-cyan-200">
          Register now
        </Link>
      </p>
    </motion.div>
  );
}

export default LoginPage;
