"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Search, Send } from "lucide-react";
import { contacts, type WorkspaceState } from "./workspace-state";
import type { Depot } from "./planning";

export function WorkspaceChat({
  state,
  depot,
  onSave,
}: {
  state: WorkspaceState;
  depot: Depot;
  onSave: (value: WorkspaceState, feedback: string) => boolean;
}) {
  const [role, setRole] = useState("All roles");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const thread = useRef<HTMLDivElement>(null);
  const conversation = useRef<HTMLElement>(null);
  const filtered = contacts.filter(
    (c) =>
      c.depot === depot &&
      (role === "All roles" || role === c.role) &&
      `${c.name} ${c.role}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = filtered.find((c) => c.id === selectedId) ?? filtered[0];
  const messages = state.messages.filter((m) => m.contactId === selected?.id);
  const messageCount = messages.length;
  useEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [selected?.id, messageCount]);
  function send() {
    if (!selected || !text.trim()) {
      setError("Write a message first.");
      return;
    }
    if (
      onSave(
        {
          ...state,
          messages: [
            ...state.messages,
            {
              id: crypto.randomUUID(),
              contactId: selected.id,
              text: text.trim(),
              outgoing: true,
              at: new Date().toISOString(),
            },
          ],
        },
        "Message saved locally. No external message was sent.",
      )
    ) {
      setText("");
      setError("");
    } else
      setError("The message was not saved. Your text is preserved; try again.");
  }
  return (
    <div className="chat-workspace">
      <aside
        className="workspace-panel chat-directory"
        aria-label="Demo conversations"
      >
        <div className="workspace-panel-heading">
          <h2>Conversations</h2>
          <MessageSquare size={18} />
        </div>
        <div className="chat-directory-filters">
          <label className="dispatch-search">
            <Search size={16} />
            <input
              aria-label="Search conversations"
              placeholder="Search team or outlet"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter conversation role"
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
        </div>
        <div
          className="chat-contacts"
          tabIndex={0}
          aria-label="Scrollable conversations"
        >
          {filtered.map((c) => {
            const latest = state.messages
              .filter((m) => m.contactId === c.id)
              .at(-1);
            const unread = state.messages.filter(
              (m) =>
                m.contactId === c.id &&
                !m.outgoing &&
                !state.read.includes(m.id),
            ).length;
            return (
              <button
                key={c.id}
                aria-label={`Open conversation ${c.name}`}
                aria-pressed={selected?.id === c.id}
                onClick={() => {
                  setSelectedId(c.id);
                  setError("");
                  requestAnimationFrame(() => {
                    if (matchMedia("(max-width: 760px)").matches) {
                      conversation.current?.focus();
                      conversation.current?.scrollIntoView({
                        block: "start",
                        behavior: "smooth",
                      });
                    }
                  });
                }}
              >
                <span className="contact-avatar">
                  {c.role.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <strong>{c.name}</strong>
                  <small>{c.role}</small>
                  <small className="chat-preview">
                    {latest?.text ?? "Start a local conversation"}
                  </small>
                </span>
                {unread > 0 && (
                  <span className="workspace-count">{unread}</span>
                )}
              </button>
            );
          })}
          {!filtered.length && (
            <div className="workspace-empty">
              <h3>No conversations found</h3>
              <p>Try another role or search term.</p>
            </div>
          )}
        </div>
      </aside>
      <section
        className="workspace-panel chat-conversation"
        aria-label="Conversation"
        tabIndex={-1}
        ref={conversation}
      >
        {selected ? (
          <>
            <div className="chat-thread-heading">
              <span className="contact-avatar">
                {selected.role.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <h2>{selected.name}</h2>
                <p>
                  {selected.role} · {selected.context}
                </p>
              </div>
              <button
                className="dispatch-text-button"
                disabled={
                  !messages.some(
                    (m) => !m.outgoing && !state.read.includes(m.id),
                  )
                }
                onClick={() =>
                  onSave(
                    {
                      ...state,
                      read: [
                        ...new Set([
                          ...state.read,
                          ...messages
                            .filter((m) => !m.outgoing)
                            .map((m) => m.id),
                        ]),
                      ],
                    },
                    "Conversation marked as read locally.",
                  )
                }
              >
                Mark as read
              </button>
            </div>
            <p className="workspace-note chat-demo-note">
              Demo conversation. Messages stay in this browser and are not
              delivered to people.
            </p>
            <div
              className="chat-thread"
              ref={thread}
              tabIndex={0}
              aria-label="Scrollable message history"
              role="log"
              aria-live="polite"
            >
              {messages.length ? (
                messages.map((m) => (
                  <article
                    key={m.id}
                    className={`chat-message ${m.outgoing ? "outgoing" : "incoming"}`}
                  >
                    <p>{m.text}</p>
                    <small>
                      {m.outgoing
                        ? "You · Saved locally"
                        : "Sample incoming message"}{" "}
                      ·{" "}
                      {new Intl.DateTimeFormat("en", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Colombo",
                      }).format(new Date(m.at))}
                    </small>
                  </article>
                ))
              ) : (
                <div className="workspace-empty">
                  <MessageSquare size={28} />
                  <h3>Start a local conversation</h3>
                  <p>No messages in this demo thread yet.</p>
                </div>
              )}
            </div>
            <form
              className="chat-compose"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <label className="sr-only" htmlFor="local-chat-message">
                Message text
              </label>
              <textarea
                id="local-chat-message"
                aria-label="Message text"
                placeholder="Write a local demo message…"
                value={text}
                maxLength={2000}
                onChange={(e) => setText(e.target.value)}
                rows={2}
              />
              <button
                className="workspace-action"
                type="submit"
                disabled={!text.trim()}
              >
                <Send size={17} /> Save message
              </button>
            </form>
            {error && (
              <p className="workspace-form-error chat-error" role="alert">
                {error}
              </p>
            )}
          </>
        ) : (
          <div className="workspace-empty">
            <h2>Select a conversation</h2>
            <p>Change your filters to show this depot’s demo contacts.</p>
          </div>
        )}
      </section>
    </div>
  );
}
