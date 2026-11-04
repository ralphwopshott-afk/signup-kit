/** One requirement on the password. Rules are passed IN; the core never hard-codes any. */
interface PasswordRule {
    id: string;
    /** Short, plain English, e.g. "At least 8 characters". */
    label: string;
    test(password: string): boolean;
}
interface SignUpValues {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}
type SignUpField = "firstName" | "lastName" | "email" | "password" | "code";
type StepResult = {
    status: "done";
} | {
    status: "error";
    field?: SignUpField;
    message: string;
};
type SignUpResult = {
    status: "verify-email";
} | StepResult;
/**
 * What an auth backend (Clerk, Firebase, Supabase...) has to provide.
 * The form never imports a backend; it only talks to this.
 */
interface SignUpAdapter {
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
interface SignUpText {
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
    resend: string;
    resent: string;
    working: string;
    genericError: string;
    required: string;
    requirements: string;
}
declare const DEFAULT_TEXT: SignUpText;

export { DEFAULT_TEXT as D, type PasswordRule as P, type SignUpAdapter as S, type SignUpField as a, type SignUpText as b, type SignUpResult as c, type SignUpValues as d, type StepResult as e };
