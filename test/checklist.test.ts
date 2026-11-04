import { canContinue, evaluateRules } from "../src/checklist";
import { rulesFromClerkSettings } from "../src/clerk/rules";
import { mapClerkError } from "../src/clerk/errors";
import type { PasswordRule } from "../src/types";

const rules: PasswordRule[] = [
  { id: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "num", label: "A number", test: (p) => /\d/.test(p) },
];

describe("checklist", () => {
  it("ticks rules live and never reports a failure state", () => {
    expect(evaluateRules(rules, "").map((s) => s.met)).toEqual([false, false]);
    expect(evaluateRules(rules, "abcdefgh").map((s) => s.met)).toEqual([true, false]);
    expect(evaluateRules(rules, "abcdefg1").map((s) => s.met)).toEqual([true, true]);
  });
  it("a throwing rule counts as not met", () => {
    const bad: PasswordRule = {
      id: "x",
      label: "x",
      test: () => {
        throw new Error("no");
      },
    };
    expect(evaluateRules([bad], "a")[0].met).toBe(false);
  });
  it("canContinue needs every rule and a matching confirm", () => {
    expect(canContinue(rules, "abcdefg1", "abcdefg1")).toBe(true);
    expect(canContinue(rules, "abcdefg1", "abcdefg2")).toBe(false);
    expect(canContinue(rules, "abcdefg", "abcdefg")).toBe(false);
    expect(canContinue(rules, "", "")).toBe(false);
  });
});

describe("rulesFromClerkSettings", () => {
  const prod = {
    min_length: 0,
    require_special_char: false,
    require_numbers: false,
    require_uppercase: false,
    require_lowercase: false,
    show_zxcvbn: true,
    min_zxcvbn_strength: 2,
    allowed_special_characters: "!@#",
  };
  it("uses Clerk's default 8 when min_length is 0, plus strength when enforced", () => {
    const r = rulesFromClerkSettings(prod, (p) => (p === "good-one-here" ? 3 : 1));
    expect(r.map((x) => x.id)).toEqual(["min-length", "strength"]);
    expect(r[0].test("1234567")).toBe(false);
    expect(r[0].test("12345678")).toBe(true);
    expect(r[1].test("good-one-here")).toBe(true);
    expect(r[1].test("password1")).toBe(false);
  });
  it("adds only the character rules the instance requires, from camelCase too", () => {
    const r = rulesFromClerkSettings({
      minLength: 10,
      requireNumbers: true,
      requireSpecialChar: true,
      allowedSpecialCharacters: "!@#",
    });
    expect(r.map((x) => x.id)).toEqual(["min-length", "number", "special"]);
    expect(r[2].test("abc!")).toBe(true);
    expect(r[2].test("abc$")).toBe(false);
  });
  it("omits the strength row when the instance does not enforce it", () => {
    expect(rulesFromClerkSettings({ show_zxcvbn: false }, () => 4).map((x) => x.id)).toEqual(["min-length"]);
  });
});

describe("mapClerkError", () => {
  it("maps known codes to plain English and a field", () => {
    const m = mapClerkError({ errors: [{ code: "form_password_pwned", message: "x" }] });
    expect(m.field).toBe("password");
    expect(m.message).toMatch(/data breach/);
    expect(mapClerkError({ errors: [{ code: "form_identifier_exists" }] }).field).toBe("email");
    expect(mapClerkError({ errors: [{ code: "form_code_incorrect" }] }).field).toBe("code");
  });
  it("falls back to Clerk's sentence, with the field from the param name", () => {
    const m = mapClerkError({ errors: [{ code: "weird", longMessage: "Odd thing.", meta: { paramName: "email_address" } }] });
    expect(m).toEqual({ field: "email", message: "Odd thing." });
    expect(mapClerkError(new Error("boom")).message).toMatch(/went wrong/);
  });
});
