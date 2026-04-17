import { useState } from "react";
import { appMeta } from "@/lib/constants";
import justLogo from "@/assets/just-logo.webp";

function UniversityLogo({ className = "", alt, fallbackClassName = "" }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`grid place-items-center rounded-xl bg-[linear-gradient(135deg,var(--role-accent-text),rgb(var(--accent-primary)))] text-[11px] font-semibold text-white ${fallbackClassName}`}
        aria-label="University logo fallback"
      >
        {appMeta.shortName}
      </div>
    );
  }

  return (
    <img
      src={justLogo}
      alt={alt || `${appMeta.universityName} logo`}
      className={`object-contain ${className}`}
      onError={() => setHasError(true)}
    />
  );
}

export default UniversityLogo;
