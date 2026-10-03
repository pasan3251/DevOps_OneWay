"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  CircleAlert,
  ClipboardList,
  Eye,
  EyeOff,
  Headset,
  LoaderCircle,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WaypointLogo } from "@/components/waypoint-logo";
import { authService } from "./auth-service";
import { demoAccounts, DEMO_PASSWORD, type Role } from "./accounts";

const signInSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or employee ID."),
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean(),
});
type SignInFields = z.infer<typeof signInSchema>;
const roleIcons = {
  dispatcher: ClipboardList,
  loader: PackageCheck,
  driver: Truck,
  "store-manager": Store,
};
const workflow = ["Order", "Plan", "Load", "Deliver", "Receive"];

export function SignInPortal() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<Role | null>(null);
  const [demoAnnouncement, setDemoAnnouncement] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignInFields>({
    resolver: zodResolver(signInSchema),
    defaultValues: { identifier: "", password: "", remember: false },
  });
  const remember = useWatch({ control, name: "remember" });

  async function signIn(values: SignInFields) {
    setServerError(null);
    try {
      const session = await authService.signIn(values);
      router.push(`/workspace/${session.role}`);
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Sign-in failed. Please try again.",
      );
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  function selectDemo(role: Role) {
    const account = demoAccounts.find((entry) => entry.role === role)!;
    setSelectedDemo(role);
    setServerError(null);
    setValue("identifier", account.email, { shouldValidate: true });
    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
    setDemoAnnouncement(
      `${account.label} demo details filled. Select Sign in to continue.`,
    );
    setFocus("identifier");
  }

  return (
    <main className="sign-in-page" id="main-content">
      <section className="brand-panel" aria-label="About Waypoint">
        <WaypointLogo light />
        <div className="brand-story">
          <h2>
            Every delivery.
            <br />
            One shared plan.
          </h2>
          <p>
            From the warehouse to the store, keep your people and your
            deliveries moving together.
          </p>
          <div
            className="workflow-diagram"
            aria-label="Delivery workflow: order, plan, load, deliver, receive"
          >
            <div className="workflow-line" aria-hidden="true" />
            {workflow.map((step, index) => (
              <div className="workflow-stop" key={step}>
                <span
                  className={`workflow-node${index === 1 ? " workflow-node-active" : ""}`}
                  aria-hidden="true"
                >
                  {index === 4 ? <Check size={16} /> : <span />}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <div className="network-context">
            <span>
              <strong>120</strong> retail outlets
            </span>
            <span>
              <strong>2</strong> distribution hubs
            </span>
            <span>
              <strong>4</strong> connected roles
            </span>
          </div>
        </div>
        <div className="brand-footer">
          <span>
            Fresh <span aria-hidden="true">/</span> Style{" "}
            <span aria-hidden="true">/</span> Tech
          </span>
          <span>One Waypoint.</span>
        </div>
      </section>
      <section className="portal-panel" aria-labelledby="sign-in-heading">
        <div className="mobile-brand">
          <WaypointLogo />
        </div>
        <div className="sign-in-content">
          <div className="sign-in-heading">
            <h1 id="sign-in-heading">Sign in</h1>
            <p>Use your operational role account.</p>
          </div>
          <form
            noValidate
            onSubmit={(event) => { void handleSubmit(signIn)(event); }}
            className="sign-in-form"
            aria-busy={isSubmitting}
          >
            <div className="form-field">
              <label htmlFor="identifier">Email or employee ID</label>
              <div className="input-wrap">
                <UserRound
                  size={18}
                  aria-hidden="true"
                  className="input-icon"
                />
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="name@waypoint.lk or employee ID"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.identifier}
                  aria-describedby={
                    errors.identifier ? "identifier-error" : undefined
                  }
                  className="auth-input"
                  {...register("identifier", {
                    onChange: () => {
                      setServerError(null);
                      setSelectedDemo(null);
                    },
                  })}
                />
              </div>
              {errors.identifier && (
                <p id="identifier-error" className="field-error">
                  {errors.identifier.message}
                </p>
              )}
            </div>
            <div className="form-field">
              <div className="password-label">
                <label htmlFor="password">Password</label>
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      className="text-action"
                      type="button"
                      disabled={isSubmitting}
                    >
                      Forgot password?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="help-dialog">
                    <DialogHeader>
                      <DialogTitle>Password help</DialogTitle>
                      <DialogDescription>
                        This is the frontend demo. Password reset will be
                        available when account services are connected.
                      </DialogDescription>
                    </DialogHeader>
                    <p>
                      For now, choose a demo role below the sign-in form. It
                      fills the details you need to explore that workspace.
                    </p>
                    <div className="help-note">
                      <Headset size={19} aria-hidden="true" />
                      <span>
                        For an operational account, contact your dispatch desk.
                      </span>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="input-wrap">
                <LockKeyhole
                  size={18}
                  aria-hidden="true"
                  className="input-icon"
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  className="auth-input password-input"
                  {...register("password", {
                    onChange: () => {
                      setServerError(null);
                      setSelectedDemo(null);
                    },
                  })}
                />
                <button
                  type="button"
                  className="password-visibility"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff size={19} aria-hidden="true" />
                  ) : (
                    <Eye size={19} aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="field-error">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="remember-row">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(value) =>
                  setValue("remember", value === true)
                }
                disabled={isSubmitting}
              />
              <label htmlFor="remember">Keep me signed in</label>
            </div>
            {serverError && (
              <div
                role="alert"
                className="sign-in-error"
                ref={errorRef}
                tabIndex={-1}
              >
                <CircleAlert size={18} aria-hidden="true" />
                <span>{serverError}</span>
              </div>
            )}
            <Button
              type="submit"
              className="sign-in-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle
                    size={19}
                    className="loading-spinner"
                    aria-hidden="true"
                  />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={19} aria-hidden="true" />
                </>
              )}
            </Button>
          </form>
          <div className="demo-section">
            <div className="section-divider">
              <span>Explore a demo</span>
            </div>
            <p>Choose a role to fill the sign-in details.</p>
            <div className="demo-roles" aria-label="Demo accounts">
              {demoAccounts.map((account) => {
                const Icon = roleIcons[account.role];
                const selected = selectedDemo === account.role;
                return (
                  <button
                    type="button"
                    key={account.role}
                    className={`demo-role${selected ? " demo-role-selected" : ""}`}
                    onClick={() => selectDemo(account.role)}
                    aria-pressed={selected}
                    disabled={isSubmitting}
                  >
                    <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
                    <span>
                      <strong>{account.label}</strong>
                      <span>{account.context}</span>
                    </span>
                    {selected ? (
                      <Check
                        size={16}
                        aria-hidden="true"
                        className="demo-check"
                      />
                    ) : (
                      <ArrowRight
                        size={15}
                        aria-hidden="true"
                        className="demo-arrow"
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <span role="status" className="sr-only">
              {demoAnnouncement}
            </span>
            <p className="demo-disclosure">
              <ShieldCheck size={15} aria-hidden="true" />
              Demo access only. Account services are coming next.
            </p>
          </div>
        </div>
        <footer className="portal-footer">
          <span>Waypoint Group</span>
          <span>Need help? Contact your dispatch desk.</span>
        </footer>
      </section>
    </main>
  );
}
