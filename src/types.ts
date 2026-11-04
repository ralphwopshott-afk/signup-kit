/** One requirement on the password. Rules are passed IN; the core never hard-codes any. */
export interface PasswordRule {
  id: string;
  /** Short, plain English, e.g. "At least 8 characters". */
  label: string;
  test(password: string): boolean;
}

export interface SignUpValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export type SignUpField = "firstName" | "lastName" | "email" | "password" | "code";

export type StepResult = { status: "done" } | { status: "error"; field?: SignUpField; message: string };

export type SignUpResult = { status: "verify-email" } | StepResult;

/**
 * What an auth backend (Clerk, Firebase, Supabase...) has to provide.
 * The form never imports a backend; it only talks to this.
 */
export interface SignUpAdapter {
  /** The password requirements to show and enforce. May load (e.g. from the backend's settings). */
  getRules(): Promise<PasswordRule[]> | PasswordRule[];
  /** Create the account. `verify-email` moves the form to the code screen. */
  signUp(values: SignUpValues): Promise<SignUpResult>;
  /** Check the emailed code. Required if signUp can return `verify-email`. */
  verifyEmail?(code: string): Promise<StepResult>;
  /** Send a fresh code. */
  resendCode?(): Promise<StepResult>;
  /** Start Google sign-up (usually a full-page redirect). Its presence shows the Google button. */
  google?(): Promise<void | StepResult>;
  /** Optional id of an empty element the backend needs on the page (Clerk's bot check). */
  captchaElementId?: string;
}

export interface SignUpText {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  passwordsMatch: string;
  continue: string;
  google: string;
  or: string;
  haveAccount: string;
  signIn: string;
  showPassword: string;
  hidePassword: string;
  verifyTitle: string;
  verifyHint: (email: string) => string;
  code: string;
  back: string;
  resend: string;
  resent: string;
  working: string;
  genericError: string;
  required: string;
  requirements: string;
}

export const DEFAULT_TEXT: SignUpText = {
  title: "Create your account",
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  password: "Password",
  confirmPassword: "Confirm password",
  passwordsMatch: "Passwords match",
  continue: "Continue",
  google: "Continue with Google",
  or: "or",
  haveAccount: "Already have an account?",
  signIn: "Sign in",
  showPassword: "Show password",
  hidePassword: "Hide password",
  verifyTitle: "Check your email",
  verifyHint: (email) => (email ? `We sent a 6-digit code to ${email}` : "We sent you a 6-digit code"),
  code: "6-digit code",
  back: "Wrong email? Go back",
  resend: "Resend code",
  resent: "Code sent",
  working: "One moment…",
  genericError: "Something went wrong. Please try again.",
  required: "Please fill this in",
  requirements: "Password requirements",
};
