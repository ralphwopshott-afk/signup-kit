import type { PasswordRule } from "./types";

export interface RuleStatus {
  id: string;
  label: string;
  met: boolean;
}

/** Live status of every rule for the current password. Pure; only "met" / "not yet met", never "failed". */
export function evaluateRules(rules: PasswordRule[], password: string): RuleStatus[] {
  return rules.map((r) => {
    let met = false;
    try {
      met = Boolean(r.test(password));
    } catch {
      met = false;
    }
    return { id: r.id, label: r.label, met };
  });
}

/** Can the form be submitted? Every rule passes, the passwords match and something is typed. */
export function canContinue(rules: PasswordRule[], password: string, confirm: string): boolean {
  if (password.length === 0) return false;
  return password === confirm && evaluateRules(rules, password).every((s) => s.met);
}
