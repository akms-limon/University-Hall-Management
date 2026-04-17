import { env } from "./env.js";

function baseCookieOptions() {
  const options = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: "/",
    signed: true,
  };

  if (env.COOKIE_DOMAIN) {
    options.domain = env.COOKIE_DOMAIN;
  }

  return options;
}

export function getAuthCookieOptions() {
  return {
    ...baseCookieOptions(),
    maxAge: env.COOKIE_MAX_AGE_MS,
  };
}

export function getClearCookieOptions() {
  return baseCookieOptions();
}
