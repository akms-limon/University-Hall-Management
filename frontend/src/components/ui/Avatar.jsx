import { useEffect, useState } from "react";
import { resolveAssetUrl } from "@/utils/resolveAssetUrl";

function Avatar({ name = "", size = "md", src = "" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = resolveAssetUrl(src);
  const shouldShowImage = Boolean(imageSrc) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [imageSrc]);

  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  if (shouldShowImage) {
    return (
      <img
        src={imageSrc}
        alt={`${name || "User"} profile`}
        className={`${sizes[size]} rounded-full object-cover shadow-[var(--role-accent-shadow)]`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} grid place-items-center rounded-full bg-[linear-gradient(135deg,var(--role-accent-text),rgb(var(--accent-primary)))] text-white font-semibold shadow-[var(--role-accent-shadow)]`}
    >
      {initials || "U"}
    </div>
  );
}

export default Avatar;
