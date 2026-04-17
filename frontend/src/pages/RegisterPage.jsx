import { useState } from "react";
import { motion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema } from "@/features/auth/validation";
import AuthField from "@/features/auth/components/AuthField";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath } from "@/utils/navigation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function RegisterPage() {
  const navigate = useNavigate();
  const { register: createAccount } = useAuth();
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const onSubmit = async (values) => {
    setApiError("");
    try {
      const user = await createAccount(values);
      navigate(getDashboardPath(user.role), { replace: true });
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Failed to create account."));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <p className="text-xs uppercase tracking-[0.18em] text-indigo-300">Student Registration</p>
      <h1 className="text-2xl font-display font-bold mt-2">Create your account</h1>
      <p className="text-sm text-slate-400 mt-2">Students can self-register. Staff and provost are managed by provost.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {apiError ? (
          <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{apiError}</div>
        ) : null}

        <AuthField label="Full Name" error={errors.name?.message} {...register("name")} />
        <AuthField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <AuthField label="Phone Number" type="tel" error={errors.phone?.message} {...register("phone")} />
        <AuthField
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          hint="Minimum 8 chars with upper, lower, number, and special character."
          {...register("password")}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <p className="mt-5 text-sm text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="text-cyan-300 hover:text-cyan-200">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}

export default RegisterPage;
