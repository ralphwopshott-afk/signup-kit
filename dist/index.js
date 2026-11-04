// src/SignUpForm.tsx
import { useEffect, useId, useMemo, useRef, useState } from "react";

// src/checklist.ts
function evaluateRules(rules, password) {
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
function canContinue(rules, password, confirm) {
  if (password.length === 0) return false;
  return password === confirm && evaluateRules(rules, password).every((s) => s.met);
}

// src/types.ts
var DEFAULT_TEXT = {
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
  verifyHint: (email) => email ? `We sent a 6-digit code to ${email}` : "We sent you a 6-digit code",
  code: "6-digit code",
  back: "Wrong email? Go back",
  resend: "Resend code",
  resent: "Code sent",
  working: "One moment\u2026",
  genericError: "Something went wrong. Please try again.",
  required: "Please fill this in",
  requirements: "Password requirements"
};

// src/SignUpForm.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var GOOGLE_G = /* @__PURE__ */ jsxs("svg", { className: "sk-google-g", width: "20", height: "20", viewBox: "0 0 48 48", "aria-hidden": "true", focusable: "false", children: [
  /* @__PURE__ */ jsx("path", { fill: "#EA4335", d: "M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" }),
  /* @__PURE__ */ jsx("path", { fill: "#4285F4", d: "M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" }),
  /* @__PURE__ */ jsx("path", { fill: "#FBBC05", d: "M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" }),
  /* @__PURE__ */ jsx("path", { fill: "#34A853", d: "M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" })
] });
function Eye({ off }) {
  return /* @__PURE__ */ jsxs("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ jsx("path", { d: "M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "3" }),
    off ? /* @__PURE__ */ jsx("path", { d: "M3 3l18 18" }) : null
  ] });
}
function Tick({ met }) {
  return /* @__PURE__ */ jsx("span", { className: "sk-tick", "aria-hidden": "true", children: met ? /* @__PURE__ */ jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3.5", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx("path", { d: "M5 12.5l4.5 4.5L19 7.5" }) }) : null });
}
function Checklist({ items, label }) {
  return /* @__PURE__ */ jsx("ul", { className: "sk-checklist", "aria-label": label, children: items.map((s) => /* @__PURE__ */ jsxs("li", { className: "sk-check", "data-met": s.met ? "true" : "false", "data-rule": s.id, children: [
    /* @__PURE__ */ jsx(Tick, { met: s.met }),
    /* @__PURE__ */ jsx("span", { children: s.label }),
    /* @__PURE__ */ jsx("span", { className: "sk-sr", children: s.met ? " (done)" : " (not yet)" })
  ] }, s.id)) });
}
function Field(props) {
  const id = useId();
  const errId = `${id}-err`;
  return /* @__PURE__ */ jsxs("div", { className: "sk-field", children: [
    /* @__PURE__ */ jsx("label", { className: "sk-label", htmlFor: id, children: props.label }),
    props.children({ id, describedBy: props.error ? errId : void 0, invalid: Boolean(props.error) }),
    props.error ? /* @__PURE__ */ jsx("p", { className: "sk-error", id: errId, role: "alert", children: props.error }) : null
  ] });
}
function SignUpForm({ adapter, signInHref, onSignIn, onDone, text, className }) {
  const t = useMemo(() => ({ ...DEFAULT_TEXT, ...text }), [text]);
  const [rules, setRules] = useState([]);
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("details");
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;
  useEffect(() => {
    let live = true;
    Promise.resolve(adapter.getRules()).then((r) => live && setRules(r)).catch(() => live && setRules([]));
    return () => {
      live = false;
    };
  }, []);
  const statuses = useMemo(() => evaluateRules(rules, password), [rules, password]);
  const matches = password.length > 0 && password === confirm;
  const allNamed = firstName.trim() !== "" && lastName.trim() !== "" && email.trim() !== "";
  const ready = allNamed && canContinue(rules, password, confirm);
  const clear = (k) => setErrors((e) => e[k] || e.form ? { ...e, [k]: void 0, form: void 0 } : e);
  function applyError(r) {
    setErrors({ [r.field ?? "form"]: r.message || t.genericError });
  }
  async function guard(fn) {
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      setErrors({ form: e instanceof Error && e.message ? e.message : t.genericError });
      return void 0;
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    if (!ready || busy) return;
    setErrors({});
    const r = await guard(
      () => adapterRef.current.signUp({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password })
    );
    if (!r) return;
    if (r.status === "verify-email") {
      setStep("verify");
      setCode("");
    } else if (r.status === "done") onDone?.();
    else applyError(r);
  }
  async function verify(value) {
    if (busy || !adapterRef.current.verifyEmail) return;
    setErrors({});
    const r = await guard(() => adapterRef.current.verifyEmail(value));
    if (!r) return;
    if (r.status === "done") onDone?.();
    else applyError({ field: "code", message: r.message });
  }
  async function resend() {
    if (busy || !adapterRef.current.resendCode) return;
    setErrors({});
    setResent(false);
    const r = await guard(() => adapterRef.current.resendCode());
    if (!r) return;
    if (r.status === "error") applyError({ field: "code", message: r.message });
    else setResent(true);
  }
  async function google() {
    if (busy || !adapterRef.current.google) return;
    setErrors({});
    const r = await guard(() => adapterRef.current.google());
    if (r && r.status === "error") applyError(r);
  }
  const signInLink = signInHref || onSignIn ? /* @__PURE__ */ jsxs("p", { className: "sk-switch", children: [
    t.haveAccount,
    " ",
    /* @__PURE__ */ jsx(
      "a",
      {
        className: "sk-link",
        href: signInHref ?? "#",
        onClick: (e) => {
          if (onSignIn) {
            e.preventDefault();
            onSignIn();
          }
        },
        children: t.signIn
      }
    )
  ] }) : null;
  if (step === "verify") {
    return /* @__PURE__ */ jsxs("div", { className: `sk-card ${className ?? ""}`.trim(), "data-step": "verify", children: [
      /* @__PURE__ */ jsx("h1", { className: "sk-title", children: t.verifyTitle }),
      /* @__PURE__ */ jsx("p", { className: "sk-hint", children: t.verifyHint(email.trim()) }),
      /* @__PURE__ */ jsxs(
        "form",
        {
          noValidate: true,
          onSubmit: (e) => {
            e.preventDefault();
            if (code.length === 6) void verify(code);
          },
          children: [
            /* @__PURE__ */ jsx(Field, { label: t.code, error: errors.code, children: ({ id, describedBy, invalid }) => /* @__PURE__ */ jsx(
              "input",
              {
                id,
                className: "sk-input sk-code",
                inputMode: "numeric",
                autoComplete: "one-time-code",
                pattern: "[0-9]*",
                maxLength: 6,
                autoFocus: true,
                value: code,
                "aria-invalid": invalid,
                "aria-describedby": describedBy,
                onChange: (e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(v);
                  clear("code");
                  if (v.length === 6) void verify(v);
                }
              }
            ) }),
            errors.form ? /* @__PURE__ */ jsx("p", { className: "sk-error", role: "alert", children: errors.form }) : null,
            /* @__PURE__ */ jsx("button", { className: "sk-button sk-primary", type: "submit", disabled: code.length !== 6 || busy, children: busy ? t.working : t.continue })
          ]
        }
      ),
      /* @__PURE__ */ jsx("p", { className: "sk-switch", children: /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "sk-link sk-linkbutton",
          onClick: () => {
            setStep("details");
            setErrors({});
            setCode("");
            setResent(false);
          },
          children: t.back
        }
      ) }),
      adapter.resendCode ? /* @__PURE__ */ jsxs("p", { className: "sk-switch", children: [
        /* @__PURE__ */ jsx("button", { type: "button", className: "sk-link sk-linkbutton", onClick: resend, disabled: busy, children: t.resend }),
        resent ? /* @__PURE__ */ jsxs("span", { className: "sk-resent", role: "status", children: [
          " \xB7 ",
          t.resent
        ] }) : null
      ] }) : null
    ] });
  }
  const type = show ? "text" : "password";
  const eye = /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      className: "sk-eye",
      "aria-label": show ? t.hidePassword : t.showPassword,
      "aria-pressed": show,
      onClick: () => setShow((s) => !s),
      children: /* @__PURE__ */ jsx(Eye, { off: show })
    }
  );
  return /* @__PURE__ */ jsxs("div", { className: `sk-card ${className ?? ""}`.trim(), "data-step": "details", children: [
    /* @__PURE__ */ jsx("h1", { className: "sk-title", children: t.title }),
    adapter.google ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("button", { type: "button", className: "sk-button sk-google", onClick: google, disabled: busy, children: [
        GOOGLE_G,
        /* @__PURE__ */ jsx("span", { children: t.google })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "sk-divider", role: "separator", children: /* @__PURE__ */ jsx("span", { children: t.or }) })
    ] }) : null,
    /* @__PURE__ */ jsxs("form", { noValidate: true, onSubmit: submit, children: [
      /* @__PURE__ */ jsxs("div", { className: "sk-row", children: [
        /* @__PURE__ */ jsx(Field, { label: t.firstName, error: errors.firstName, children: ({ id, describedBy, invalid }) => /* @__PURE__ */ jsx(
          "input",
          {
            id,
            className: "sk-input",
            autoComplete: "given-name",
            required: true,
            value: firstName,
            "aria-invalid": invalid,
            "aria-describedby": describedBy,
            onChange: (e) => {
              setFirst(e.target.value);
              clear("firstName");
            }
          }
        ) }),
        /* @__PURE__ */ jsx(Field, { label: t.lastName, error: errors.lastName, children: ({ id, describedBy, invalid }) => /* @__PURE__ */ jsx(
          "input",
          {
            id,
            className: "sk-input",
            autoComplete: "family-name",
            required: true,
            value: lastName,
            "aria-invalid": invalid,
            "aria-describedby": describedBy,
            onChange: (e) => {
              setLast(e.target.value);
              clear("lastName");
            }
          }
        ) })
      ] }),
      /* @__PURE__ */ jsx(Field, { label: t.email, error: errors.email, children: ({ id, describedBy, invalid }) => /* @__PURE__ */ jsx(
        "input",
        {
          id,
          className: "sk-input",
          type: "email",
          autoComplete: "email",
          inputMode: "email",
          required: true,
          value: email,
          "aria-invalid": invalid,
          "aria-describedby": describedBy,
          onChange: (e) => {
            setEmail(e.target.value);
            clear("email");
          }
        }
      ) }),
      /* @__PURE__ */ jsx(Field, { label: t.password, error: errors.password, children: ({ id, describedBy, invalid }) => /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "sk-pw", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              id,
              className: "sk-input",
              type,
              autoComplete: "new-password",
              required: true,
              value: password,
              "aria-invalid": invalid,
              "aria-describedby": describedBy,
              onChange: (e) => {
                setPassword(e.target.value);
                clear("password");
              }
            }
          ),
          eye
        ] }),
        statuses.length > 0 ? /* @__PURE__ */ jsx(Checklist, { items: statuses, label: t.requirements }) : null
      ] }) }),
      /* @__PURE__ */ jsx(Field, { label: t.confirmPassword, children: ({ id }) => /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "sk-pw", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              id,
              className: "sk-input",
              type,
              autoComplete: "new-password",
              required: true,
              value: confirm,
              onChange: (e) => setConfirm(e.target.value)
            }
          ),
          eye
        ] }),
        /* @__PURE__ */ jsx(Checklist, { items: [{ id: "match", label: t.passwordsMatch, met: matches }] })
      ] }) }),
      adapter.captchaElementId ? /* @__PURE__ */ jsx("div", { id: adapter.captchaElementId }) : null,
      errors.form ? /* @__PURE__ */ jsx("p", { className: "sk-error", role: "alert", children: errors.form }) : null,
      /* @__PURE__ */ jsx("button", { className: "sk-button sk-primary", type: "submit", disabled: !ready || busy, children: busy ? t.working : t.continue })
    ] }),
    signInLink
  ] });
}
export {
  DEFAULT_TEXT,
  SignUpForm,
  canContinue,
  evaluateRules
};
