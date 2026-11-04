import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignUpForm } from "../src";
import type { SignUpAdapter } from "../src";

const rules = [
  { id: "len", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "num", label: "A number", test: (p: string) => /\d/.test(p) },
];

function make(over: Partial<SignUpAdapter> = {}): SignUpAdapter {
  return {
    getRules: () => rules,
    signUp: vi.fn(async () => ({ status: "verify-email" as const })),
    verifyEmail: vi.fn(async () => ({ status: "done" as const })),
    resendCode: vi.fn(async () => ({ status: "done" as const })),
    ...over,
  };
}

async function fillDetails(u: ReturnType<typeof userEvent.setup>, pw = "abcdefg1", confirm = pw) {
  await u.type(screen.getByLabelText("First name"), "Ann");
  await u.type(screen.getByLabelText("Last name"), "Lee");
  await u.type(screen.getByLabelText("Email"), "ann@example.com");
  await u.type(screen.getByLabelText("Password"), pw);
  await u.type(screen.getByLabelText("Confirm password"), confirm);
}

const cont = () => screen.getByRole("button", { name: "Continue" });
const rule = (label: string) => screen.getByText(label).closest("li")!;

describe("SignUpForm", () => {
  it("shows no subtitle or 'optional' text and a Google button only when supported", async () => {
    const { rerender } = render(<SignUpForm adapter={make()} />);
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
    expect(screen.queryByText(/optional/i)).toBeNull();
    expect(screen.queryByText(/continue with google/i)).toBeNull();
    rerender(<SignUpForm adapter={make({ google: async () => {} })} />);
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
  });

  it("ticks checklist rows live; nothing is met before typing", async () => {
    const u = userEvent.setup();
    render(<SignUpForm adapter={make()} />);
    await screen.findByText("At least 8 characters");
    expect(rule("At least 8 characters")).toHaveAttribute("data-met", "false");
    await u.type(screen.getByLabelText("Password"), "abcdefgh");
    expect(rule("At least 8 characters")).toHaveAttribute("data-met", "true");
    expect(rule("A number")).toHaveAttribute("data-met", "false");
    await u.type(screen.getByLabelText("Password"), "1");
    expect(rule("A number")).toHaveAttribute("data-met", "true");
  });

  it("keeps Continue disabled until rules pass and passwords match", async () => {
    const u = userEvent.setup();
    render(<SignUpForm adapter={make()} />);
    await screen.findByText("A number");
    await fillDetails(u, "abcdefg1", "abcdefg2");
    expect(rule("Passwords match")).toHaveAttribute("data-met", "false");
    expect(cont()).toBeDisabled();
    await u.clear(screen.getByLabelText("Confirm password"));
    await u.type(screen.getByLabelText("Confirm password"), "abcdefg1");
    expect(rule("Passwords match")).toHaveAttribute("data-met", "true");
    expect(cont()).toBeEnabled();
  });

  it("stays disabled when a rule fails even if the passwords match", async () => {
    const u = userEvent.setup();
    render(<SignUpForm adapter={make()} />);
    await screen.findByText("A number");
    await fillDetails(u, "abcdefgh");
    expect(cont()).toBeDisabled();
  });

  it("goes to the code step, verifies, and calls onDone", async () => {
    const u = userEvent.setup();
    const adapter = make();
    const onDone = vi.fn();
    render(<SignUpForm adapter={adapter} onDone={onDone} />);
    await screen.findByText("A number");
    await fillDetails(u);
    await u.click(cont());
    expect(adapter.signUp).toHaveBeenCalledWith({
      firstName: "Ann",
      lastName: "Lee",
      email: "ann@example.com",
      password: "abcdefg1",
    });
    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    await u.type(screen.getByLabelText("6-digit code"), "424242");
    await waitFor(() => expect(adapter.verifyEmail).toHaveBeenCalledWith("424242"));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("calls onDone straight away when no verification is needed", async () => {
    const u = userEvent.setup();
    const onDone = vi.fn();
    render(<SignUpForm adapter={make({ signUp: async () => ({ status: "done" }) })} onDone={onDone} />);
    await screen.findByText("A number");
    await fillDetails(u);
    await u.click(cont());
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("shows a backend error beside its field and clears it on edit", async () => {
    const u = userEvent.setup();
    render(
      <SignUpForm
        adapter={make({
          signUp: async () => ({ status: "error", field: "email", message: "There is already an account with this email." }),
        })}
      />,
    );
    await screen.findByText("A number");
    await fillDetails(u);
    await u.click(cont());
    const err = await screen.findByRole("alert");
    expect(err).toHaveTextContent("already an account");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    await u.type(screen.getByLabelText("Email"), "x");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a wrong-code error on the code field and can resend", async () => {
    const u = userEvent.setup();
    const adapter = make({
      verifyEmail: vi.fn(async () => ({ status: "error" as const, field: "code" as const, message: "That code isn't right." })),
    });
    render(<SignUpForm adapter={adapter} />);
    await screen.findByText("A number");
    await fillDetails(u);
    await u.click(cont());
    await u.type(await screen.findByLabelText("6-digit code"), "111111");
    expect(await screen.findByRole("alert")).toHaveTextContent("isn't right");
    await u.click(screen.getByRole("button", { name: "Resend code" }));
    expect(adapter.resendCode).toHaveBeenCalled();
    expect(await screen.findByText(/Code sent/)).toBeInTheDocument();
  });

  it("lets the user go back from the code step with fields kept", async () => {
    const u = userEvent.setup();
    render(<SignUpForm adapter={make()} />);
    await screen.findByText("A number");
    await fillDetails(u);
    await u.click(cont());
    await u.click(await screen.findByRole("button", { name: "Wrong email? Go back" }));
    expect(screen.getByLabelText("Email")).toHaveValue("ann@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("abcdefg1");
  });

  it("toggles password visibility", async () => {
    const u = userEvent.setup();
    render(<SignUpForm adapter={make()} />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    await u.click(screen.getAllByRole("button", { name: "Show password" })[0]);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
  });
});
