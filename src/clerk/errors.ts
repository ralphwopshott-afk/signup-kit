import type { SignUpField } from "../types";

export interface MappedError {
  field?: SignUpField;
  message: string;
}

const MESSAGES: Record<string, MappedError> = {
  form_password_pwned: { field: "password", message: "This password has appeared in a data breach. Please choose a different one." },
  form_password_pwned__sign_in: { field: "password", message: "This password has appeared in a data breach. Please choose a different one." },
  form_password_not_strong_enough: { field: "password", message: "That password is too easy to guess. Try a longer one or add a few more words." },
  form_password_size_in_bytes_exceeded: { field: "password", message: "That password is too long." },
  form_password_length_too_short: { field: "password", message: "That password is too short." },
  form_password_validation_failed: { field: "password", message: "That password isn't allowed. Please try another." },
  form_password_digits_missing: { field: "password", message: "The password needs a number." },
  form_password_uppercase_missing: { field: "password", message: "The password needs a capital letter." },
  form_password_lowercase_missing: { field: "password", message: "The password needs a lowercase letter." },
  form_password_special_char_missing: { field: "password", message: "The password needs a symbol, like ! or ?." },
  form_identifier_exists: { field: "email", message: "There is already an account with this email. Try signing in instead." },
  form_param_format_invalid: { field: "email", message: "That doesn't look like an email address." },
  form_param_nil: { message: "Please fill in every box." },
  form_code_incorrect: { field: "code", message: "That code isn't right. Please check it and try again." },
  verification_failed: { field: "code", message: "That code isn't right. Please check it and try again." },
  verification_expired: { field: "code", message: "That code has expired. Tap “Resend code” for a new one." },
  verification_already_verified: { field: "code", message: "This email is already confirmed." },
  too_many_requests: { message: "Too many tries. Please wait a minute and try again." },
  rate_limit_exceeded: { message: "Too many tries. Please wait a minute and try again." },
  captcha_invalid: { message: "We couldn't check you're not a robot. Please refresh the page and try again." },
  captcha_unavailable: { message: "We couldn't check you're not a robot. Please refresh the page and try again." },
  network_error: { message: "We couldn't reach the server. Please check your connection and try again." },
};

const PARAM_FIELD: Record<string, SignUpField> = {
  first_name: "firstName",
  firstName: "firstName",
  last_name: "lastName",
  lastName: "lastName",
  email_address: "email",
  emailAddress: "email",
  identifier: "email",
  password: "password",
  code: "code",
};

interface ClerkLikeError {
  errors?: Array<{ code?: string; message?: string; longMessage?: string; meta?: { paramName?: string } }>;
  message?: string;
}

/** Turn whatever Clerk threw into a plain-English message and the field it belongs to. */
export function mapClerkError(err: unknown, fallback = "Something went wrong. Please try again."): MappedError {
  const e = (err ?? {}) as ClerkLikeError;
  const first = e.errors?.[0];
  if (!first) return { message: fallback };
  const known = first.code ? MESSAGES[first.code] : undefined;
  if (known) return known;
  const field = first.meta?.paramName ? PARAM_FIELD[first.meta.paramName] : undefined;
  // Unknown code: Clerk's own sentence is still English and usually clear.
  return { field, message: first.longMessage || first.message || fallback };
}
