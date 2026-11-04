import { useClerk, useSignUp } from "@clerk/clerk-react";
import { useMemo, useRef } from "react";
import type { PasswordRule, SignUpAdapter, SignUpResult, StepResult } from "../types";
import { mapClerkError } from "./errors";
import { loadZxcvbnEstimator, normaliseClerkPasswordSettings, rulesFromClerkSettings } from "./rules";

export interface ClerkAdapterOptions {
  /** Where to go once signed up (and after Google). */
  redirectUrlComplete: string;
  /** Page that mounts Clerk's <AuthenticateWithRedirectCallback /> for the Google round trip. Default "/sso-callback". */
  ssoCallbackUrl?: string;
  /** Hide the Google button even if the instance has it. */
  disableGoogle?: boolean;
}

/** Frontend API host is base64 inside the publishable key: pk_(test|live)_<base64(host + "$")>. */
export function frontendApiFromKey(publishableKey: string): string | undefined {
  try {
    const encoded = publishableKey.split("_").slice(2).join("_");
    const host = atob(encoded).replace(/\$$/, "");
    return host || undefined;
  } catch {
    return undefined;
  }
}

async function readPasswordSettings(clerk: unknown, publishableKey: string | undefined): Promise<unknown> {
  // clerk-js keeps the loaded environment on an unstable-but-present field.
  const env = (clerk as { __unstable__environment?: { userSettings?: { passwordSettings?: unknown } } })
    .__unstable__environment;
  const fromClerk = env?.userSettings?.passwordSettings;
  if (fromClerk) return fromClerk;
  const host = publishableKey ? frontendApiFromKey(publishableKey) : undefined;
  if (!host) throw new Error("Cannot find the Clerk instance's password settings");
  const res = await fetch(`https://${host}/v1/environment`);
  if (!res.ok) throw new Error(`Clerk environment request failed (${res.status})`);
  const json = (await res.json()) as { user_settings?: { password_settings?: unknown } };
  return json.user_settings?.password_settings;
}

/**
 * Clerk implementation of the sign-up adapter. Password rules come from the
 * Clerk instance's own settings, so a password that ticks every row is accepted.
 * Must be used under <ClerkProvider>.
 */
export function useClerkSignUpAdapter(options: ClerkAdapterOptions): SignUpAdapter {
  const { isLoaded, signUp, setActive } = useSignUp();
  const clerk = useClerk();
  // Latest values, read at call time, so the returned adapter object can stay stable.
  const live = useRef({ isLoaded, signUp, setActive, clerk, options });
  live.current = { isLoaded, signUp, setActive, clerk, options };

  return useMemo<SignUpAdapter>(() => {
    const notReady: StepResult = { status: "error", message: "Still loading. Please try again in a moment." };

    async function finish(res: { status: string | null; createdSessionId: string | null }): Promise<StepResult> {
      const { setActive } = live.current;
      if (res.status === "complete" && res.createdSessionId && setActive) {
        await setActive({ session: res.createdSessionId });
        return { status: "done" };
      }
      return { status: "error", message: "We couldn't finish creating your account. Please try again." };
    }

    return {
      captchaElementId: "clerk-captcha",

      async getRules(): Promise<PasswordRule[]> {
        const { clerk } = live.current;
        // Wait briefly for clerk-js to load its environment.
        for (let i = 0; i < 50 && !(clerk as { loaded?: boolean }).loaded; i++) await new Promise((r) => setTimeout(r, 100));
        const raw = await readPasswordSettings(clerk, (clerk as { publishableKey?: string }).publishableKey);
        const settings = normaliseClerkPasswordSettings(raw);
        const estimate = settings.show_zxcvbn ? await loadZxcvbnEstimator() : undefined;
        return rulesFromClerkSettings(raw, estimate);
      },

      async signUp(values): Promise<SignUpResult> {
        const { signUp, isLoaded } = live.current;
        if (!isLoaded || !signUp) return notReady;
        try {
          const created = await signUp.create({
            firstName: values.firstName,
            lastName: values.lastName,
            emailAddress: values.email,
            password: values.password,
          });
          if (created.status === "complete") return await finish(created);
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          return { status: "verify-email" };
        } catch (e) {
          return { status: "error", ...mapClerkError(e) };
        }
      },

      async verifyEmail(code): Promise<StepResult> {
        const { signUp, isLoaded } = live.current;
        if (!isLoaded || !signUp) return notReady;
        try {
          const r = await signUp.attemptEmailAddressVerification({ code });
          if (r.status === "complete") return await finish(r);
          return { status: "error", field: "code", message: "We couldn't confirm that code. Please try again." };
        } catch (e) {
          return { status: "error", ...mapClerkError(e), field: "code" };
        }
      },

      async resendCode(): Promise<StepResult> {
        const { signUp, isLoaded } = live.current;
        if (!isLoaded || !signUp) return notReady;
        try {
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          return { status: "done" };
        } catch (e) {
          return { status: "error", field: "code", message: mapClerkError(e).message };
        }
      },

      ...(options.disableGoogle
        ? {}
        : {
            async google(): Promise<void | StepResult> {
              const { signUp, isLoaded, options } = live.current;
              if (!isLoaded || !signUp) return notReady;
              try {
                await signUp.authenticateWithRedirect({
                  strategy: "oauth_google",
                  redirectUrl: options.ssoCallbackUrl ?? "/sso-callback",
                  redirectUrlComplete: options.redirectUrlComplete,
                });
              } catch (e) {
                return { status: "error", ...mapClerkError(e) };
              }
            },
          }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.disableGoogle]);
}
