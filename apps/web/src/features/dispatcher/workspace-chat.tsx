"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Search, Send } from "lucide-react";
import { authService } from "@/features/auth/auth-service";
import { apiRequest } from "@/lib/api-client";
import type { WorkspaceState } from "./workspace-state";
import type { Depot } from "./planning";

type Participant = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  depotId?: string | null;
  outletId?: string | null;
};

type Conversation = {
  id: string;
  title?: string | null;
  updatedAt: string;
  participants: Participant[];
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
};

type DirectoryEntry = {
  id: string;
  conversationId?: string;
  label: string;
  role: string;
  participantIds: string[];
};

type WorkspaceChatProps = {
  state?: WorkspaceState;
  depot?: Depot;
  onSave?: (value: WorkspaceState, feedback: string) => boolean;
};

function roleLabel(role: string) {
  return role.replace("store_manager", "store manager").replaceAll("_", " ");
}

export function WorkspaceChat(_props: WorkspaceChatProps) {
  const session = authService.getSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const thread = useRef<HTMLDivElement>(null);

  const loadDirectory = useCallback(async () => {
    const [conversationRows, contactRows] = await Promise.all([
      apiRequest<Conversation[]>("/messages/conversations"),
      apiRequest<Participant[]>("/messages/contacts"),
    ]);
    setConversations(conversationRows);
    setContacts(contactRows);
    setSelectedId((current) => current ?? conversationRows[0]?.id ?? (contactRows[0] ? `contact:${contactRows[0].id}` : null));
  }, []);

  useEffect(() => {
    void loadDirectory()
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Conversations could not be loaded."))
      .finally(() => setLoading(false));
  }, [loadDirectory]);

  const entries = useMemo<DirectoryEntry[]>(() => {
    const existingParticipants = new Set<string>();
    const conversationEntries = conversations.map((conversation) => {
      const others = conversation.participants.filter((participant) => participant.id !== session?.userId);
      others.forEach((participant) => existingParticipants.add(participant.id));
      return {
        id: conversation.id,
        conversationId: conversation.id,
        label: conversation.title || others.map((participant) => `${participant.firstName} ${participant.lastName}`).join(", ") || "Operations conversation",
        role: others.map((participant) => roleLabel(participant.role)).join(", ") || "Operations",
        participantIds: others.map((participant) => participant.id),
      };
    });
    const newEntries = contacts
      .filter((contact) => !existingParticipants.has(contact.id))
      .map((contact) => ({
        id: `contact:${contact.id}`,
        label: `${contact.firstName} ${contact.lastName}`,
        role: roleLabel(contact.role),
        participantIds: [contact.id],
      }));
    return [...conversationEntries, ...newEntries];
  }, [contacts, conversations, session?.userId]);

  const filtered = entries.filter((entry) => `${entry.label} ${entry.role}`.toLowerCase().includes(query.toLowerCase()));
  const selected = entries.find((entry) => entry.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!selected?.conversationId) {
      setMessages([]);
      return;
    }
    void apiRequest<Message[]>(`/messages/conversations/${selected.conversationId}`)
      .then((rows) => {
        setMessages(rows);
        return apiRequest(`/messages/conversations/${selected.conversationId}/read`, { method: "POST" });
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Message history could not be loaded."));
  }, [selected?.conversationId]);

  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight });
  }, [messages]);

  async function send() {
    if (!selected || !text.trim()) return;
    setSending(true);
    try {
      if (selected.conversationId) {
        const sent = await apiRequest<Message>(`/messages/conversations/${selected.conversationId}`, {
          method: "POST",
          body: JSON.stringify({ content: text.trim() }),
        });
        setMessages((current) => [...current, sent]);
      } else {
        const created = await apiRequest<{ conversation: Conversation; initialMessage: Message }>("/messages/conversations", {
          method: "POST",
          body: JSON.stringify({ participantIds: selected.participantIds, initialMessage: text.trim() }),
        });
        await loadDirectory();
        setSelectedId(created.conversation.id);
        setMessages(created.initialMessage ? [created.initialMessage] : []);
      }
      setText("");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-workspace">
      <aside className="workspace-panel chat-directory" aria-label="Conversations">
        <div className="workspace-panel-heading"><h2>Conversations</h2><MessageSquare size={18} /></div>
        <div className="chat-directory-filters">
          <label className="dispatch-search">
            <Search size={16} />
            <input aria-label="Search conversations" placeholder="Search people or roles" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <div className="chat-contacts" tabIndex={0} aria-label="Conversation directory">
          {filtered.map((entry) => (
            <button key={entry.id} aria-pressed={selected?.id === entry.id} onClick={() => { setSelectedId(entry.id); setError(""); }}>
              <span className="contact-avatar">{entry.role.slice(0, 2).toUpperCase()}</span>
              <span><strong>{entry.label}</strong><small>{entry.role}</small><small className="chat-preview">{entry.conversationId ? "Open conversation" : "Start conversation"}</small></span>
            </button>
          ))}
          {!loading && !filtered.length && <div className="workspace-empty"><h3>No contacts found</h3><p>No active operational users match the search.</p></div>}
        </div>
      </aside>

      <section className="workspace-panel chat-conversation" aria-label="Conversation">
        {selected ? (
          <>
            <div className="chat-thread-heading">
              <span className="contact-avatar">{selected.role.slice(0, 2).toUpperCase()}</span>
              <div><h2>{selected.label}</h2><p>{selected.role} · shared operational channel</p></div>
            </div>
            <div className="chat-thread" ref={thread} tabIndex={0} role="log" aria-live="polite">
              {messages.length ? messages.map((message) => (
                <article key={message.id} className={`chat-message ${message.senderId === session?.userId ? "outgoing" : "incoming"}`}>
                  <p>{message.content}</p>
                  <small>{message.senderId === session?.userId ? "You" : selected.label} · {new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" }).format(new Date(message.createdAt))}</small>
                </article>
              )) : <div className="workspace-empty"><MessageSquare size={28} /><h3>Start the conversation</h3><p>Messages are shared across role workspaces and stored centrally.</p></div>}
            </div>
            <form className="chat-compose" onSubmit={(event) => { event.preventDefault(); void send(); }}>
              <textarea aria-label="Message text" placeholder="Write an operational message…" value={text} maxLength={4000} onChange={(event) => setText(event.target.value)} rows={2} />
              <button className="workspace-action" type="submit" disabled={!text.trim() || sending}><Send size={17} />{sending ? "Sending…" : "Send message"}</button>
            </form>
            {error && <p className="workspace-form-error chat-error" role="alert">{error}</p>}
          </>
        ) : <div className="workspace-empty"><h2>No conversations available</h2><p>Active operational contacts will appear here.</p></div>}
      </section>
    </div>
  );
}
