"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaypointLogo } from "@/components/waypoint-logo";
import { authService, type Session } from "./auth-service";
import { demoAccounts, type Role } from "./accounts";

export function RoleWorkspace({ role }: { role: Role }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const account = demoAccounts.find((entry) => entry.role === role)!;
  useEffect(() => {
    const active = authService.getSession();
    if (!active) router.replace("/login");
    else if (active.role !== role) router.replace(`/workspace/${active.role}`);
    else {
      const task = window.setTimeout(() => setSession(active), 0);
      return () => window.clearTimeout(task);
    }
  }, [role, router]);
  function signOut() {
    try {
      authService.signOut();
      router.replace("/login");
    } catch {
      setSignOutError(
        "Your browser couldn’t clear the demo session. Allow site storage and try again.",
      );
    }
  }
  if (!session)
    return (
      <main className="workspace-loading">
        <LoaderCircle aria-hidden="true" className="loading-spinner" />
        <p role="status">Opening your workspace…</p>
      </main>
    );
  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <WaypointLogo />
        <Button variant="outline" onClick={signOut}>
          <LogOut size={17} aria-hidden="true" />
          Sign out
        </Button>
      </header>
      <section className="workspace-welcome">
        <div className="workspace-confirmation">
          <CheckCircle2 size={19} aria-hidden="true" />
          Demo sign-in successful
        </div>
        <h1>{account.label} workspace</h1>
        <p>{account.description}</p>
        <dl className="workspace-details">
          <div>
            <dt>Signed in as</dt>
            <dd>{account.name}</dd>
          </div>
          <div>
            <dt>Operational role</dt>
            <dd>{account.label}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{account.location}</dd>
          </div>
        </dl>
        <div className="workspace-next">
          <h2>Your workspace starts here.</h2>
          <p>
            The sign-in portal is ready. Operational screens and backend account
            services will be connected in the next development steps.
          </p>
          <Button variant="outline" onClick={signOut}>
            Return to sign in
            <ArrowRight size={17} aria-hidden="true" />
          </Button>
        </div>
        {signOutError && (
          <p role="alert" className="field-error">
            {signOutError}
          </p>
        )}
      </section>
    </main>
  );
}
