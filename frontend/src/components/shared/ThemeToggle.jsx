import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { THEMES, applyTheme, initializeTheme, persistTheme } from "@/lib/theme";

function ThemeToggle() {
  const [theme, setTheme] = useState(THEMES.LIGHT);

  useEffect(() => {
    setTheme(initializeTheme());
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    applyTheme(nextTheme);
    persistTheme(nextTheme);
    setTheme(nextTheme);
  };

  const isDark = theme === THEMES.DARK;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="grid h-11 w-11 place-items-center rounded-[5px] border border-[rgba(var(--accent-warning),0.45)] bg-[rgba(var(--accent-warning),0.14)] text-[rgb(var(--accent-warning))] transition-colors hover:bg-[rgba(var(--accent-warning),0.2)] sm:h-9 sm:w-9"
    >
      {isDark ? <SunMedium size={16} /> : <MoonStar size={16} />}
    </button>
  );
}

export default ThemeToggle;
