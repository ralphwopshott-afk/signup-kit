import type { PasswordRule } from "../types";

/** The slice of Clerk's password settings we use. Accepts both the raw Frontend API (snake_case) and clerk-js (camelCase) shapes. */
export interface ClerkPasswordSettings {
  min_length?: number;
  max_length?: number;
  require_numbers?: boolean;
  require_special_char?: boolean;
  require_uppercase?: boolean;
  require_lowercase?: boolean;
  show_zxcvbn?: boolean;
  min_zxcvbn_strength?: number;
  allowed_special_characters?: string;
}

/** Clerk's own minimum when the instance leaves min_length at 0 ("default"). */
export const CLERK_DEFAULT_MIN_LENGTH = 8;

const pick = <T,>(o: Record<string, unknown>, snake: string, camel: string): T | undefined =>
  (o[snake] ?? o[camel]) as T | undefined;

export function normaliseClerkPasswordSettings(raw: unknown): ClerkPasswordSettings {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    min_length: pick<number>(o, "min_length", "minLength"),
    max_length: pick<number>(o, "max_length", "maxLength"),
    require_numbers: pick<boolean>(o, "require_numbers", "requireNumbers"),
    require_special_char: pick<boolean>(o, "require_special_char", "requireSpecialChar"),
    require_uppercase: pick<boolean>(o, "require_uppercase", "requireUppercase"),
    require_lowercase: pick<boolean>(o, "require_lowercase", "requireLowercase"),
    show_zxcvbn: pick<boolean>(o, "show_zxcvbn", "showZxcvbn"),
    min_zxcvbn_strength: pick<number>(o, "min_zxcvbn_strength", "minZxcvbnStrength"),
    allowed_special_characters: pick<string>(o, "allowed_special_characters", "allowedSpecialCharacters"),
  };
}

/** Returns a zxcvbn score 0-4 for a password. Injected so tests (and the app) choose the estimator. */
export type StrengthEstimator = (password: string) => number;

function escapeForClass(chars: string): string {
  return chars.replace(/[\\\]^-]/g, "\\$&");
}

/**
 * The checklist for a Clerk instance, straight from its own settings. Order:
 * length, character kinds, then strength. Strength is only a row when the instance enforces it
 * (`show_zxcvbn`) AND an estimator is supplied.
 */
export function rulesFromClerkSettings(raw: unknown, estimate?: StrengthEstimator): PasswordRule[] {
  const s = normaliseClerkPasswordSettings(raw);
  const rules: PasswordRule[] = [];

  const min = s.min_length && s.min_length > 0 ? s.min_length : CLERK_DEFAULT_MIN_LENGTH;
  rules.push({ id: "min-length", label: `At least ${min} characters`, test: (pw) => pw.length >= min });
  // No upper-limit row on purpose: clerk-js reports its 72-character ceiling as a setting, and a row
  // that is ticked from the start is just noise. Someone who hits it gets a plain-English error.
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

let estimatorPromise: Promise<StrengthEstimator> | undefined;

/** Loads zxcvbn (with English + common dictionaries) on first use only. */
export function loadZxcvbnEstimator(): Promise<StrengthEstimator> {
  estimatorPromise ??= (async () => {
    const [core, common, en] = await Promise.all([
      import("@zxcvbn-ts/core"),
      import("@zxcvbn-ts/language-common"),
      import("@zxcvbn-ts/language-en"),
    ]);
    core.zxcvbnOptions.setOptions({
      translations: en.translations,
      graphs: common.adjacencyGraphs,
      dictionary: { ...common.dictionary, ...en.dictionary },
    });
    return (pw: string) => core.zxcvbn(pw).score;
  })();
  return estimatorPromise;
}
