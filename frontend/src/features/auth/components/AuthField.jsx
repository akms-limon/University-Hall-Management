import { forwardRef, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Input from "@/components/ui/Input";

const AuthField = forwardRef(function AuthField(
  { label, error, hint, type = "text", ...inputProps },
  ref
) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = type === "password";
  const resolvedType = useMemo(() => {
    if (!isPasswordField) return type;
    return isPasswordVisible ? "text" : "password";
  }, [isPasswordField, isPasswordVisible, type]);

  return (
    <label className="block">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="relative mt-1">
        <Input
          ref={ref}
          type={resolvedType}
          className={isPasswordField ? "pr-10" : ""}
          {...inputProps}
        />
        {isPasswordField ? (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
          >
            {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : null}
      </div>
      {hint && !error ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
    </label>
  );
});

AuthField.displayName = "AuthField";

export default AuthField;
