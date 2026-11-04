import * as react from 'react';
import { S as SignUpAdapter, b as SignUpText, P as PasswordRule } from './types-C--RnKg3.js';
export { D as DEFAULT_TEXT, a as SignUpField, c as SignUpResult, d as SignUpValues, e as StepResult } from './types-C--RnKg3.js';

interface SignUpFormProps {
    adapter: SignUpAdapter;
    /** Where "Sign in" goes. Rendered as a normal link unless onSignIn is given. */
    signInHref?: string;
    /** Intercept the Sign in click (client-side routing). */
    onSignIn?: () => void;
    /** Called once the account exists and the user is signed in. */
    onDone?: () => void;
    /** Override any wording. */
    text?: Partial<SignUpText>;
    className?: string;
}
declare function SignUpForm({ adapter, signInHref, onSignIn, onDone, text, className }: SignUpFormProps): react.JSX.Element;

interface RuleStatus {
    id: string;
    label: string;
    met: boolean;
}
/** Live status of every rule for the current password. Pure; only "met" / "not yet met", never "failed". */
declare function evaluateRules(rules: PasswordRule[], password: string): RuleStatus[];
/** Can the form be submitted? Every rule passes, the passwords match and something is typed. */
declare function canContinue(rules: PasswordRule[], password: string, confirm: string): boolean;

export { PasswordRule, type RuleStatus, SignUpAdapter, SignUpForm, type SignUpFormProps, SignUpText, canContinue, evaluateRules };
