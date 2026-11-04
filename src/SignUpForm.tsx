import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { canContinue, evaluateRules } from "./checklist";
import {
  DEFAULT_TEXT,
  type PasswordRule,
  type SignUpAdapter,
  type SignUpField,
  type SignUpText,
} from "./types";

export interface SignUpFormProps {
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

type Errors = Partial<Record<SignUpField | "form", string>>;

const GOOGLE_G = (
  <svg className="sk-google-g" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

function Eye({ off }: { off: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="M3 3l18 18" /> : null}
    </svg>
  );
}

function Tick({ met }: { met: boolean }) {
  return (
    <span className="sk-tick" aria-hidden="true">
      {met ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      ) : null}
    </span>
  );
}

function Checklist({ items, label }: { items: { id: string; label: string; met: boolean }[]; label?: string }) {
  return (
    <ul className="sk-checklist" aria-label={label}>
      {items.map((s) => (
        <li key={s.id} className="sk-check" data-met={s.met ? "true" : "false"} data-rule={s.id}>
          <Tick met={s.met} />
          <span>{s.label}</span>
          <span className="sk-sr">{s.met ? " (done)" : " (not yet)"}</span>
        </li>
      ))}
    </ul>
  );
}

function Field(props: {
  label: string;
  error?: string;
  children: (a: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div className="sk-field">
      <label className="sk-label" htmlFor={id}>
        {props.label}
      </label>
      {props.children({ id, describedBy: props.error ? errId : undefined, invalid: Boolean(props.error) })}
      {props.error ? (
        <p className="sk-error" id={errId} role="alert">
          {props.error}
        </p>
      ) : null}
    </div>
  );
}

export function SignUpForm({ adapter, signInHref, onSignIn, onDone, text, className }: SignUpFormProps) {
  const t = useMemo<SignUpText>(() => ({ ...DEFAULT_TEXT, ...text }), [text]);
  const [rules, setRules] = useState<PasswordRule[]>([]);
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"details" | "verify">("details");
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  useEffect(() => {
    let live = true;
    Promise.resolve(adapter.getRules())
      .then((r) => live && setRules(r))
      .catch(() => live && setRules([]));
    return () => {
      live = false;
    };
    // The adapter object may be re-created each render by a hook; load rules once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statuses = useMemo(() => evaluateRules(rules, password), [rules, password]);
  const matches = password.length > 0 && password === confirm;
  const allNamed = firstName.trim() !== "" && lastName.trim() !== "" && email.trim() !== "";
  const ready = allNamed && canContinue(rules, password, confirm);

  const clear = (k: SignUpField) =>
    setErrors((e) => (e[k] || e.form ? { ...e, [k]: undefined, form: undefined } : e));

  function applyError(r: { field?: SignUpField; message: string }) {
    setErrors({ [r.field ?? "form"]: r.message || t.genericError });
  }

  async function guard<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      setErrors({ form: e instanceof Error && e.message ? e.message : t.genericError });
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setErrors({});
    const r = await guard(() =>
      adapterRef.current.signUp({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password }),
    );
    if (!r) return;
    if (r.status === "verify-email") {
      setStep("verify");
      setCode("");
    } else if (r.status === "done") onDone?.();
    else applyError(r);
  }

  async function verify(value: string) {
    if (busy || !adapterRef.current.verifyEmail) return;
    setErrors({});
    const r = await guard(() => adapterRef.current.verifyEmail!(value));
    if (!r) return;
    if (r.status === "done") onDone?.();
    else applyError({ field: "code", message: r.message });
  }

  async function resend() {
    if (busy || !adapterRef.current.resendCode) return;
    setErrors({});
    setResent(false);
    const r = await guard(() => adapterRef.current.resendCode!());
    if (!r) return;
    if (r.status === "error") applyError({ field: "code", message: r.message });
    else setResent(true);
  }

  async function google() {
    if (busy || !adapterRef.current.google) return;
    setErrors({});
    const r = await guard(() => adapterRef.current.google!());
    if (r && r.status === "error") applyError(r);
  }

  const signInLink = signInHref || onSignIn ? (
    <p className="sk-switch">
      {t.haveAccount}{" "}
      <a
        className="sk-link"
        href={signInHref ?? "#"}
        onClick={(e) => {
          if (onSignIn) {
            e.preventDefault();
            onSignIn();
          }
        }}
      >
        {t.signIn}
      </a>
    </p>
  ) : null;

  if (step === "verify") {
    return (
      <div className={`sk-card ${className ?? ""}`.trim()} data-step="verify">
        <h1 className="sk-title">{t.verifyTitle}</h1>
        <p className="sk-hint">{t.verifyHint(email.trim())}</p>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6) void verify(code);
          }}
        >
          <Field label={t.code} error={errors.code}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                className="sk-input sk-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                value={code}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(v);
                  clear("code");
                  if (v.length === 6) void verify(v);
                }}
              />
            )}
          </Field>
          {errors.form ? <p className="sk-error" role="alert">{errors.form}</p> : null}
          <button className="sk-button sk-primary" type="submit" disabled={code.length !== 6 || busy}>
            {busy ? t.working : t.continue}
          </button>
        </form>
        <p className="sk-switch">
          <button
            type="button"
            className="sk-link sk-linkbutton"
            onClick={() => {
              setStep("details");
              setErrors({});
              setCode("");
              setResent(false);
            }}
          >
            {t.back}
          </button>
        </p>
        {adapter.resendCode ? (
          <p className="sk-switch">
            <button type="button" className="sk-link sk-linkbutton" onClick={resend} disabled={busy}>
              {t.resend}
            </button>
            {resent ? <span className="sk-resent" role="status"> · {t.resent}</span> : null}
          </p>
        ) : null}
      </div>
    );
  }

  const type = show ? "text" : "password";
  const eye = (
    <button
      type="button"
      className="sk-eye"
      aria-label={show ? t.hidePassword : t.showPassword}
      aria-pressed={show}
      onClick={() => setShow((s) => !s)}
    >
      <Eye off={show} />
    </button>
  );

  return (
    <div className={`sk-card ${className ?? ""}`.trim()} data-step="details">
      <h1 className="sk-title">{t.title}</h1>
      {adapter.google ? (
        <>
          <button type="button" className="sk-button sk-google" onClick={google} disabled={busy}>
            {GOOGLE_G}
            <span>{t.google}</span>
          </button>
          <div className="sk-divider" role="separator">
            <span>{t.or}</span>
          </div>
        </>
      ) : null}
      <form noValidate onSubmit={submit}>
        <div className="sk-row">
          <Field label={t.firstName} error={errors.firstName}>
            {({ id, describedBy, invalid }) => (
              <input id={id} className="sk-input" autoComplete="given-name" required value={firstName} aria-invalid={invalid} aria-describedby={describedBy}
                onChange={(e) => { setFirst(e.target.value); clear("firstName"); }} />
            )}
          </Field>
          <Field label={t.lastName} error={errors.lastName}>
            {({ id, describedBy, invalid }) => (
              <input id={id} className="sk-input" autoComplete="family-name" required value={lastName} aria-invalid={invalid} aria-describedby={describedBy}
                onChange={(e) => { setLast(e.target.value); clear("lastName"); }} />
            )}
          </Field>
        </div>
        <Field label={t.email} error={errors.email}>
          {({ id, describedBy, invalid }) => (
            <input id={id} className="sk-input" type="email" autoComplete="email" inputMode="email" required value={email} aria-invalid={invalid} aria-describedby={describedBy}
              onChange={(e) => { setEmail(e.target.value); clear("email"); }} />
          )}
        </Field>
        <Field label={t.password} error={errors.password}>
          {({ id, describedBy, invalid }) => (
            <>
              <div className="sk-pw">
                <input id={id} className="sk-input" type={type} autoComplete="new-password" required value={password} aria-invalid={invalid} aria-describedby={describedBy}
                  onChange={(e) => { setPassword(e.target.value); clear("password"); }} />
                {eye}
              </div>
              {statuses.length > 0 ? <Checklist items={statuses} label={t.requirements} /> : null}
            </>
          )}
        </Field>
        <Field label={t.confirmPassword}>
          {({ id }) => (
            <>
              <div className="sk-pw">
                <input id={id} className="sk-input" type={type} autoComplete="new-password" required value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} />
                {eye}
              </div>
              <Checklist items={[{ id: "match", label: t.passwordsMatch, met: matches }]} />
            </>
          )}
        </Field>
        {adapter.captchaElementId ? <div id={adapter.captchaElementId} /> : null}
        {errors.form ? <p className="sk-error" role="alert">{errors.form}</p> : null}
        <button className="sk-button sk-primary" type="submit" disabled={!ready || busy}>
          {busy ? t.working : t.continue}
        </button>
      </form>
      {signInLink}
    </div>
  );
}
