export function getApiErrorMessage(error, fallbackMessage) {
  if (error?.response?.data?.errors?.length) {
    return error.response.data.errors[0].message;
  }

  return error?.response?.data?.message || fallbackMessage;
}
