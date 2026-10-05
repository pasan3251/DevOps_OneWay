"use client";

import { useEffect, useState } from "react";
import { Bell, Check, LoaderCircle, MessageSquare, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { authService, type Session } from "@/features/auth/auth-service";
import { apiRequest } from "@/lib/api-client";
import { WorkspaceChat } from "@/features/dispatcher/workspace-chat";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export function SharedAccountTools({ session, compact = true }: { session: Session; compact?: boolean }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(session);
  const [firstName, setFirstName] = useState(session.name.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(session.name.split(" ").slice(1).join(" "));
  const [phone, setPhone] = useState(session.phone ?? "");
  const [saving, setSaving] = useState(false);
  const unread = notifications.filter((notification) => !notification.isRead).length;

  useEffect(() => {
    void apiRequest<Notification[]>("/notifications")
      .then(setNotifications)
      .catch(() => undefined);
  }, []);

  async function openNotifications() {
    setNotificationsOpen(true);
    setLoading(true);
    try {
      setNotifications(await apiRequest<Notification[]>("/notifications"));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Notifications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "POST" });
      setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, isRead: true } : notification));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Notification could not be marked as read.");
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await apiRequest("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() || undefined }),
      });
      const refreshed = await authService.refreshProfile();
      setProfile(refreshed);
      setProfileOpen(false);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile changes could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" className={compact ? "dispatch-icon-button" : "workspace-action"} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} onClick={() => void openNotifications()}>
        <Bell size={18} aria-hidden="true" />
        {!compact && <span>Notifications</span>}
        {unread > 0 && <span className="nav-count">{unread}</span>}
      </button>
      <button type="button" className={compact ? "dispatch-icon-button" : "workspace-action"} aria-label="Open profile" onClick={() => setProfileOpen(true)}>
        <UserRound size={18} aria-hidden="true" />
        {!compact && <span>Profile</span>}
      </button>
      <button type="button" className={compact ? "dispatch-icon-button" : "workspace-action"} aria-label="Open messages" onClick={() => setMessagesOpen(true)}>
        <MessageSquare size={18} aria-hidden="true" />
        {!compact && <span>Messages</span>}
      </button>

      <Dialog open={messagesOpen} onOpenChange={setMessagesOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-hidden">
          <DialogHeader><DialogTitle>Messages</DialogTitle><DialogDescription>Shared operational conversations across Waypoint roles.</DialogDescription></DialogHeader>
          <WorkspaceChat />
        </DialogContent>
      </Dialog>

      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Notifications</DialogTitle><DialogDescription>System events for your operational responsibilities.</DialogDescription></DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto space-y-2">
            {loading && <p className="flex items-center gap-2 text-sm"><LoaderCircle className="animate-spin" size={16} />Loading notifications…</p>}
            {!loading && notifications.map((notification) => (
              <article key={notification.id} className="rounded-md border p-3 text-sm" data-read={notification.isRead}>
                <div className="flex items-start justify-between gap-3">
                  <div><strong>{notification.title}</strong><p className="text-muted-foreground mt-1">{notification.message}</p><small>{new Date(notification.createdAt).toLocaleString()}</small></div>
                  {!notification.isRead && <Button size="sm" variant="outline" onClick={() => void markRead(notification.id)}><Check size={14} />Read</Button>}
                </div>
              </article>
            ))}
            {!loading && !notifications.length && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>Profile</DialogTitle><DialogDescription>{profile.email} · {profile.role.replace("-", " ")} · {profile.location}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <label className="grid gap-1 text-sm">First name<input className="rounded-md border bg-background px-3 py-2" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
            <label className="grid gap-1 text-sm">Last name<input className="rounded-md border bg-background px-3 py-2" value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
            <label className="grid gap-1 text-sm">Phone<input className="rounded-md border bg-background px-3 py-2" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+94…" /></label>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <Button className="w-full" disabled={saving || !firstName.trim() || !lastName.trim()} onClick={() => void saveProfile()}>{saving ? "Saving…" : "Save profile"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
