# signup-kit

Ralph's one sign-up form. Edit it here once; every app that installs it gets the change.

It is the **screen** (fields, live password checklist, email-code step, wording) and nothing
else. The auth backend (Clerk, Firebase, Supabase...) plugs in through a small adapter.

## Install (private GitHub dependency, `dist/` is committed so no build is needed)

```
pnpm add "github:ralphwopshott-afk/signup-kit#v0.1.0"
```

To pick up a new version later, change the tag (`#v0.2.0`) and install again.

## Use with Clerk

```tsx
import { SignUpForm } from "signup-kit";
import { useClerkSignUpAdapter } from "signup-kit/clerk";
import "signup-kit/styles.css";

function SignUpScreen() {
  const adapter = useClerkSignUpAdapter({ redirectUrlComplete: "/" });
  return <SignUpForm adapter={adapter} signInHref="/sign-in" onDone={() => window.location.assign("/")} />;
}
```

Google needs one more page: mount Clerk's `<AuthenticateWithRedirectCallback />` at `/sso-callback`
(or set `ssoCallbackUrl`). `@clerk/clerk-react` (>= 5) is an optional peer dependency.

Password rules come from **the Clerk instance's own settings** (min length, numbers, symbols,
upper/lower case, and the strength check when the instance enforces it), so a password that ticks
every row is not then refused. If the instance enforces strength, the row "Not easy to guess" uses
zxcvbn at the same minimum score the instance reports; the zxcvbn dictionaries are only downloaded
in that case. Clerk errors (breached password, email already used, wrong code...) are turned into
plain English next to the right field (`mapClerkError`).

## Styling

Import `signup-kit/styles.css`, then map your own design tokens onto the `--sk-*` variables:

```css
.sk-card {
  --sk-accent: var(--color-accent);
  --sk-radius: var(--radius-card);
  --sk-font: var(--font-sans);
}
```

Variables: `--sk-font --sk-bg --sk-ink --sk-ink-dim --sk-edge --sk-edge-soft --sk-accent
--sk-accent-hover --sk-accent-ink --sk-ok --sk-ok-soft --sk-error --sk-focus --sk-disabled-bg
--sk-disabled-ink --sk-radius --sk-radius-control --sk-border --sk-shadow --sk-gap --sk-pad
--sk-control-h --sk-text --sk-text-small --sk-title --sk-width`.

Controls are 3.25rem tall with 18px text, and the card fits a 375px phone with no sideways scroll.

## Wording

Pass `text={{ title: "Join us" }}` to override any string (see `SignUpText` / `DEFAULT_TEXT`).

## The adapter

```ts
interface SignUpAdapter {
  getRules(): Promise<PasswordRule[]> | PasswordRule[];          // what to tick off
  signUp(values: {firstName, lastName, email, password}):
    Promise<{status: "verify-email"} | {status: "done"} | {status: "error", field?, message}>;
  verifyEmail?(code: string): Promise<{status: "done"} | {status: "error", field?, message}>;
  resendCode?(): Promise<{status: "done"} | {status: "error", field?, message}>;
  google?(): Promise<void | {status: "error", ...}>;              // present = Google button shown
  captchaElementId?: string;                                      // empty <div id> some backends need
}
interface PasswordRule { id: string; label: string; test(password: string): boolean }
```

`field` is one of `firstName | lastName | email | password | code`; the message is shown beside
that field (no `field` = above the button). `done` means the user is now signed in; the form then
calls `onDone`.

### Firebase sketch (not built yet)

```ts
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export function useFirebaseSignUpAdapter(auth: Auth): SignUpAdapter {
  return {
    getRules: () => [
      { id: "len", label: "At least 6 characters", test: (p) => p.length >= 6 }, // Firebase's default policy
    ],
    async signUp({ firstName, lastName, email, password }) {
      try {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: `${firstName} ${lastName}` });
        await sendEmailVerification(user);   // Firebase sends a link, not a code:
        return { status: "done" };           // skip the code step (omit verifyEmail).
      } catch (e: any) {
        if (e.code === "auth/email-already-in-use") return { status: "error", field: "email", message: "There is already an account with this email." };
        if (e.code === "auth/weak-password") return { status: "error", field: "password", message: "That password is too weak." };
        return { status: "error", message: "Something went wrong. Please try again." };
      }
    },
    google: async () => { await signInWithPopup(auth, new GoogleAuthProvider()); },
  };
}
```

Supabase is the same shape: `supabase.auth.signUp({ email, password, options: { data: { first_name, last_name } } })`
then `verifyEmail` -> `supabase.auth.verifyOtp({ email, token, type: "signup" })`.

## Develop

```
pnpm install
pnpm test          # vitest
pnpm build         # tsup -> dist/ (commit it!) + dist/styles.css
```

Release: bump `version`, `pnpm build`, commit `dist/`, `git tag vX.Y.Z`, push with tags.
