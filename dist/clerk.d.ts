import { S as SignUpAdapter, P as PasswordRule, a as SignUpField } from './types-BpzGCy2P.js';

interface ClerkAdapterOptions {
    /** Where to go once signed up (and after Google). */
    redirectUrlComplete: string;
    /** Page that mounts Clerk's <AuthenticateWithRedirectCallback /> for the Google round trip. Default "/sso-callback". */
    ssoCallbackUrl?: string;
    /** Hide the Google button even if the instance has it. */
    disableGoogle?: boolean;
}
/** Frontend API host is base64 inside the publishable key: pk_(test|live)_<base64(host + "$")>. */
declare function frontendApiFromKey(publishableKey: string): string | undefined;
/**
 * Clerk implementation of the sign-up adapter. Password rules come from the
 * Clerk instance's own settings, so a password that ticks every row is accepted.
 * Must be used under <ClerkProvider>.
 */
declare function useClerkSignUpAdapter(options: ClerkAdapterOptions): SignUpAdapter;

/** The slice of Clerk's password settings we use. Accepts both the raw Frontend API (snake_case) and clerk-js (camelCase) shapes. */
interface ClerkPasswordSettings {
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
declare const CLERK_DEFAULT_MIN_LENGTH = 8;
declare function normaliseClerkPasswordSettings(raw: unknown): ClerkPasswordSettings;
/** Returns a zxcvbn score 0-4 for a password. Injected so tests (and the app) choose the estimator. */
type StrengthEstimator = (password: string) => number;
/**
 * The checklist for a Clerk instance, straight from its own settings. Order:
 * length, character kinds, then strength. Strength is only a row when the instance enforces it
 * (`show_zxcvbn`) AND an estimator is supplied.
 */
declare function rulesFromClerkSettings(raw: unknown, estimate?: StrengthEstimator): PasswordRule[];
/** Loads zxcvbn (with English + common dictionaries) on first use only. */
declare function loadZxcvbnEstimator(): Promise<StrengthEstimator>;

interface MappedError {
    field?: SignUpField;
    message: string;
}
/** Turn whatever Clerk threw into a plain-English message and the field it belongs to. */
declare function mapClerkError(err: unknown, fallback?: string): MappedError;

export { CLERK_DEFAULT_MIN_LENGTH, type ClerkAdapterOptions, type ClerkPasswordSettings, type StrengthEstimator, frontendApiFromKey, loadZxcvbnEstimator, mapClerkError, normaliseClerkPasswordSettings, rulesFromClerkSettings, useClerkSignUpAdapter };
