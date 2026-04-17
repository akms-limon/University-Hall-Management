export const THEME_STORAGE_KEY = "uhas.theme";
export const THEMES = {
  DARK: "dark",
  LIGHT: "light",
};

const validThemes = Object.values(THEMES);

export function isValidTheme(value) {
  return validThemes.includes(value);
}

export function resolvePreferredTheme() {
  if (typeof window === "undefined") {
    return THEMES.LIGHT;
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (isValidTheme(savedTheme)) {
    return savedTheme;
  }

  return THEMES.LIGHT;
}

export function applyTheme(theme) {
  if (typeof document === "undefined") {
    return THEMES.LIGHT;
  }

  const normalizedTheme = isValidTheme(theme) ? theme : THEMES.LIGHT;
  const root = document.documentElement;
  root.classList.remove("theme-dark", "theme-light");
  root.classList.add(`theme-${normalizedTheme}`);
  root.dataset.theme = normalizedTheme;
  root.style.colorScheme = normalizedTheme;
  return normalizedTheme;
}

export function persistTheme(theme) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function initializeTheme() {
  const theme = resolvePreferredTheme();
  return applyTheme(theme);
}
