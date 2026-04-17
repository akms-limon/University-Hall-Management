export function apiResponse({ message, data = null, meta = null }) {
  return {
    success: true,
    message,
    data,
    meta,
  };
}

export function apiErrorResponse({ message, errors = undefined }) {
  return {
    success: false,
    message,
    errors,
  };
}

