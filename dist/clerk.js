// src/clerk/adapter.ts
import { useClerk, useSignUp } from "@clerk/clerk-react";
import { useMemo, useRef } from "react";

// src/clerk/errors.ts
var MESSAGES = {
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
  verification_expired: { field: "code", message: "That code has expired. Tap \u201CResend code\u201D for a new one." },
  verification_already_verified: { field: "code", message: "This email is already confirmed." },
  too_many_requests: { message: "Too many tries. Please wait a minute and try again." },
  rate_limit_exceeded: { message: "Too many tries. Please wait a minute and try again." },
  captcha_invalid: { message: "We couldn't check you're not a robot. Please refresh the page and try again." },
  captcha_unavailable: { message: "We couldn't check you're not a robot. Please refresh the page and try again." },
  network_error: { message: "We couldn't reach the server. Please check your connection and try again." }
};
var PARAM_FIELD = {
  first_name: "firstName",
  firstName: "firstName",
  last_name: "lastName",
  lastName: "lastName",
  email_address: "email",
  emailAddress: "email",
  identifier: "email",
  password: "password",
  code: "code"
};
function mapClerkError(err, fallback = "Something went wrong. Please try again.") {
  const e = err ?? {};
  const first = e.errors?.[0];
  if (!first) return { message: fallback };
  const known = first.code ? MESSAGES[first.code] : void 0;
  if (known) return known;
  const field = first.meta?.paramName ? PARAM_FIELD[first.meta.paramName] : void 0;
  return { field, message: first.longMessage || first.message || fallback };
}

// src/clerk/rules.ts
var CLERK_DEFAULT_MIN_LENGTH = 8;
var pick = (o, snake, camel) => o[snake] ?? o[camel];
function normaliseClerkPasswordSettings(raw) {
  const o = raw ?? {};
  return {
    min_length: pick(o, "min_length", "minLength"),
    max_length: pick(o, "max_length", "maxLength"),
    require_numbers: pick(o, "require_numbers", "requireNumbers"),
    require_special_char: pick(o, "require_special_char", "requireSpecialChar"),
    require_uppercase: pick(o, "require_uppercase", "requireUppercase"),
    require_lowercase: pick(o, "require_lowercase", "requireLowercase"),
    show_zxcvbn: pick(o, "show_zxcvbn", "showZxcvbn"),
    min_zxcvbn_strength: pick(o, "min_zxcvbn_strength", "minZxcvbnStrength"),
    allowed_special_characters: pick(o, "allowed_special_characters", "allowedSpecialCharacters")
  };
}
function escapeForClass(chars) {
  return chars.replace(/[\\\]^-]/g, "\\$&");
}
function rulesFromClerkSettings(raw, estimate) {
  const s = normaliseClerkPasswordSettings(raw);
  const rules = [];
  const min = s.min_length && s.min_length > 0 ? s.min_length : CLERK_DEFAULT_MIN_LENGTH;
  rules.push({ id: "min-length", label: `At least ${min} characters`, test: (pw) => pw.length >= min });
  if (s.require_lowercase) rules.push({ id: "lowercase", label: "A lowercase letter", test: (pw) => /\p{Ll}/u.test(pw) });
  if (s.require_uppercase) rules.push({ id: "uppercase", label: "A capital letter", test: (pw) => /\p{Lu}/u.test(pw) });
  if (s.require_numbers) rules.push({ id: "number", label: "A number", test: (pw) => /\d/.test(pw) });
  if (s.require_special_char) {
    const allowed = s.allowed_special_characters;
    const re = allowed ? new RegExp(`[${escapeForClass(allowed)}]`) : /[^\p{L}\p{N}\s]/u;
    rules.push({ id: "special", label: "A symbol, like ! or ?", test: (pw) => re.test(pw) });
  }
  if (s.show_zxcvbn && estimate) {
    const need = s.min_zxcvbn_strength ?? 2;
    rules.push({ id: "strength", label: "Not easy to guess", test: (pw) => pw.length > 0 && estimate(pw) >= need });
  }
  return rules;
}
var estimatorPromise;
function loadZxcvbnEstimator() {
  estimatorPromise ?? (estimatorPromise = (async () => {
    const [core, common, en] = await Promise.all([
      import("@zxcvbn-ts/core"),
      import("@zxcvbn-ts/language-common"),
      import("@zxcvbn-ts/language-en")
    ]);
    core.zxcvbnOptions.setOptions({
      translations: en.translations,
      graphs: common.adjacencyGraphs,
      dictionary: { ...common.dictionary, ...en.dictionary }
    });
    return (pw) => core.zxcvbn(pw).score;
  })());
  return estimatorPromise;
}

// src/clerk/adapter.ts
function frontendApiFromKey(publishableKey) {
  try {
    const encoded = publishableKey.split("_").slice(2).join("_");
    const host = atob(encoded).replace(/\$$/, "");
    return host || void 0;
  } catch {
    return void 0;
  }
}
async function readPasswordSettings(clerk, publishableKey) {
  const env = clerk.__unstable__environment;
  const fromClerk = env?.userSettings?.passwordSettings;
  if (fromClerk) return fromClerk;
  const host = publishableKey ? frontendApiFromKey(publishableKey) : void 0;
  if (!host) throw new Error("Cannot find the Clerk instance's password settings");
  const res = await fetch(`https://${host}/v1/environment`);
  if (!res.ok) throw new Error(`Clerk environment request failed (${res.status})`);
  const json = await res.json();
  return json.user_settings?.password_settings;
}
function useClerkSignUpAdapter(options) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const clerk = useClerk();
  const live = useRef({ isLoaded, signUp, setActive, clerk, options });
  live.current = { isLoaded, signUp, setActive, clerk, options };
  return useMemo(() => {
    const notReady = { status: "error", message: "Still loading. Please try again in a moment." };
    async function finish(res) {
      const { setActive: setActive2 } = live.current;
      if (res.status === "complete" && res.createdSessionId && setActive2) {
        await setActive2({ session: res.createdSessionId });
        return { status: "done" };
      }
      return { status: "error", message: "We couldn't finish creating your account. Please try again." };
    }
    return {
      captchaElementId: "clerk-captcha",
      async getRules() {
        const { clerk: clerk2 } = live.current;
        for (let i = 0; i < 50 && !clerk2.loaded; i++) await new Promise((r) => setTimeout(r, 100));
        const raw = await readPasswordSettings(clerk2, clerk2.publishableKey);
        const settings = normaliseClerkPasswordSettings(raw);
        const estimate = settings.show_zxcvbn ? await loadZxcvbnEstimator() : void 0;
        return rulesFromClerkSettings(raw, estimate);
      },
      async signUp(values) {
        const { signUp: signUp2, isLoaded: isLoaded2 } = live.current;
        if (!isLoaded2 || !signUp2) return notReady;
        try {
          const created = await signUp2.create({
            firstName: values.firstName,
            lastName: values.lastName,
            emailAddress: values.email,
            password: values.password
          });
          if (created.status === "complete") return await finish(created);
          await signUp2.prepareEmailAddressVerification({ strategy: "email_code" });
          return { status: "verify-email" };
        } catch (e) {
          return { status: "error", ...mapClerkError(e) };
        }
      },
      async verifyEmail(code) {
        const { signUp: signUp2, isLoaded: isLoaded2 } = live.current;
        if (!isLoaded2 || !signUp2) return notReady;
        try {
          const r = await signUp2.attemptEmailAddressVerification({ code });
          if (r.status === "complete") return await finish(r);
          return { status: "error", field: "code", message: "We couldn't confirm that code. Please try again." };
        } catch (e) {
          return { status: "error", ...mapClerkError(e), field: "code" };
        }
      },
      async resendCode() {
        const { signUp: signUp2, isLoaded: isLoaded2 } = live.current;
        if (!isLoaded2 || !signUp2) return notReady;
        try {
          await signUp2.prepareEmailAddressVerification({ strategy: "email_code" });
          return { status: "done" };
        } catch (e) {
          return { status: "error", field: "code", message: mapClerkError(e).message };
        }
      },
      ...options.disableGoogle ? {} : {
        async google() {
          const { signUp: signUp2, isLoaded: isLoaded2, options: options2 } = live.current;
          if (!isLoaded2 || !signUp2) return notReady;
          try {
            await signUp2.authenticateWithRedirect({
              strategy: "oauth_google",
              redirectUrl: options2.ssoCallbackUrl ?? "/sso-callback",
              redirectUrlComplete: options2.redirectUrlComplete
            });
          } catch (e) {
            return { status: "error", ...mapClerkError(e) };
          }
        }
      }
    };
  }, [options.disableGoogle]);
}
export {
  CLERK_DEFAULT_MIN_LENGTH,
  frontendApiFromKey,
  loadZxcvbnEstimator,
  mapClerkError,
  normaliseClerkPasswordSettings,
  rulesFromClerkSettings,
  useClerkSignUpAdapter
};
