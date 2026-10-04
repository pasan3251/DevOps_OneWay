"use client";

import { useEffect, useState } from "react";
import { Bell, Clock3, LogOut, Moon, Sun, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { contacts, type WorkspaceState } from "./workspace-state";
import { orders, vehicles, type Depot, type Plan } from "./planning";

type Destination = "planning" | "fleet" | "deferrals" | "chat";
export function WorkspaceTools({
  state,
  plan,
  depot,
  name,
  onSave,
  onNavigate,
  onSignOut,
}: {
  state: WorkspaceState;
  plan: Plan;
  depot: Depot;
  name: string;
  onSave: (value: WorkspaceState, feedback: string) => boolean;
  onNavigate: (view: Destination) => void;
  onSignOut: () => void;
}) {
  const [panel, setPanel] = useState<"notifications" | "account" | null>(null);
  const [clock, setClock] = useState("");
  const [role, setRole] = useState("All roles");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  function persist(value: WorkspaceState, feedback: string) {
    const saved = onSave(value, feedback);
    setError(saved ? "" : "This change was not saved. Check browser storage and try again.");
    return saved;
  }
  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Colombo",
        }).format(new Date()),
      );
    const initial = setTimeout(tick, 0);
    const interval = setInterval(tick, 60000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);
  const assigned = new Set(plan.trips.flatMap((t) => t.orderIds));
  const deferred = new Set(plan.deferrals.map((d) => d.orderId));
  const pending = orders.filter(
    (o) => o.depot === depot && !assigned.has(o.id) && !deferred.has(o.id),
  );
  const notifications: {
    id: string;
    title: string;
    description: string;
    role: string;
    view: Destination;
  }[] = [];
  if (pending.length)
    notifications.push({
      id: `pending-${depot}-${pending.length}`,
      title: `${pending.length} orders awaiting a dispatcher decision`,
      description: `${pending.filter((o) => o.carryOver).length} carry-over orders need review in the local demo plan.`,
      role: "Dispatcher",
      view: "planning",
    });
  if (
    plan.deferrals.some((d) =>
      orders.some((o) => o.id === d.orderId && o.depot === depot),
    )
  )
    notifications.push({
      id: `deferred-${depot}-${plan.deferrals.length}`,
      title: "Recorded deferrals",
      description: "Review reasons and the next planning decision.",
      role: "Dispatcher",
      view: "deferrals",
    });
  const workshops = vehicles.filter(
    (v) => v.depot === depot && v.workshop,
  ).length;
  if (workshops)
    notifications.push({
      id: `workshop-${depot}`,
      title: `${workshops} vehicle in workshop`,
      description: "Workshop vehicles are excluded from allocation.",
      role: "Dispatcher",
      view: "fleet",
    });
  state.messages
    .filter(
      (m) =>
        !m.outgoing &&
        contacts.some((c) => c.id === m.contactId && c.depot === depot),
    )
    .forEach((m) => {
      const contact = contacts.find((c) => c.id === m.contactId)!;
      notifications.push({
        id: m.id,
        title: contact.name,
        description: m.text,
        role: contact.role,
        view: "chat",
      });
    });
  const unread = notifications.filter((n) => !state.read.includes(n.id));
  const shown = notifications.filter(
    (n) =>
      (role === "All roles" || role === n.role) &&
      `${n.title} ${n.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <span
        className="workspace-clock"
        aria-label="Current time in Asia Colombo"
      >
        <Clock3 size={14} />
        {clock || "--:--"}
        <span>Colombo · Cutoff 16:00</span>
      </span>
      <button
        className="dispatch-icon-button"
        aria-label={
          state.theme === "light" ? "Use dark theme" : "Use light theme"
        }
        onClick={() =>
          persist(
            { ...state, theme: state.theme === "light" ? "dark" : "light" },
            "Dispatcher appearance saved locally.",
          )
        }
      >
        {state.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </button>
      <button
        className="dispatch-icon-button workspace-bell"
        aria-label={`Open notifications, ${unread.length} unread`}
        onClick={() => setPanel("notifications")}
      >
        <Bell size={19} />
        {unread.length > 0 && <span>{unread.length}</span>}
      </button>
      <button
        className="dispatch-icon-button"
        aria-label="Open account menu"
        onClick={() => setPanel("account")}
      >
        <UserRound size={19} />
      </button>
      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent
          data-theme={state.theme}
          style={panel === "notifications" ? { translate: "none" } : undefined}
          className={
            panel === "notifications"
              ? "workspace-notification-panel"
              : "dispatch-dialog"
          }
        >
          <DialogHeader>
            <DialogTitle>
              {panel === "notifications"
                ? "Notifications"
                : "Dispatcher account"}
            </DialogTitle>
            <DialogDescription>
              {panel === "notifications"
                ? "Local plan reminders and sample conversations. No live updates are connected."
                : "Frontend demo session in this browser."}
            </DialogDescription>
          </DialogHeader>
          {panel === "account" ? (
            <div className="workspace-account">
              <UserRound size={30} />
              <h3>{name}</h3>
              <p>Dispatcher · Demo account</p>
              <button className="workspace-action" onClick={onSignOut}>
                <LogOut size={17} /> Sign out
              </button>
            </div>
          ) : (
            <>
              <div className="notification-filters">
                <label className="workspace-form-field">
                  Search notifications
                  <input
                    aria-label="Search notifications"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search plan or conversation"
                  />
                </label>
                <select
                  aria-label="Filter notification role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {[
                    "All roles",
                    "Dispatcher",
                    "Loader",
                    "Driver",
                    "Store manager",
                  ].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <button
                  className="dispatch-text-button"
                  disabled={!unread.length}
                  onClick={() =>
                      persist(
                      {
                        ...state,
                        read: [
                          ...new Set([
                            ...state.read,
                            ...notifications.map((n) => n.id),
                          ]),
                        ],
                      },
                      "Notifications marked as read locally.",
                    )
                  }
                >
                  Mark all as read
                </button>
              </div>
              <div
                className="notification-list"
                tabIndex={0}
                aria-label="Scrollable notifications"
              >
                {shown.map((n) => (
                  <article
                    key={n.id}
                    className={
                      state.read.includes(n.id) ? "is-read" : "is-unread"
                    }
                  >
                    <span>
                      {n.role} · {state.read.includes(n.id) ? "Read" : "Unread"}
                    </span>
                    <h3>{n.title}</h3>
                    <p>{n.description}</p>
                    <button
                      className="dispatch-text-button"
                      onClick={() => {
                        if (
                          persist(
                            {
                              ...state,
                              read: [...new Set([...state.read, n.id])],
                            },
                            "Notification marked as read locally.",
                          )
                        ) {
                          setPanel(null);
                          onNavigate(n.view);
                        }
                      }}
                    >
                      Open{" "}
                      {n.view === "planning"
                        ? "order intake"
                        : n.view === "fleet"
                          ? "fleet"
                          : n.view === "chat"
                            ? "chat"
                            : "deferrals"}
                    </button>
                  </article>
                ))}
                {!shown.length && (
                  <div className="workspace-empty">
                    <Bell size={25} />
                    <h3>No matching notifications</h3>
                    <p>Try another role or search term.</p>
                  </div>
                )}
              </div>
              {error && <p className="workspace-form-error" role="alert">{error}</p>}
              <div className="notification-chat-link">
                <strong>
                  {
                    state.messages.filter(
                      (m) =>
                        !m.outgoing &&
                        !state.read.includes(m.id) &&
                        contacts.some(
                          (c) => c.id === m.contactId && c.depot === depot,
                        ),
                    ).length
                  }{" "}
                  unread sample messages
                </strong>
                <button
                  className="workspace-action"
                  onClick={() => {
                    setPanel(null);
                    onNavigate("chat");
                  }}
                >
                  View in Messages
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
