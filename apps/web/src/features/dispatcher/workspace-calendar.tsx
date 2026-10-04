"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEMO_DATE,
  formatTime,
  orders,
  validateTrip,
  vehicles,
  type Depot,
  type Plan,
} from "./planning";
import {
  validDate,
  type CalendarEvent,
  type WorkspaceState,
} from "./workspace-state";

export function WorkspaceCalendar({
  state,
  plan,
  depot,
  date,
  onSave,
  onDate,
  onRoute,
}: {
  state: WorkspaceState;
  plan: Plan;
  depot: Depot;
  date: string;
  onSave: (value: WorkspaceState, feedback: string) => boolean;
  onDate: (value: string) => void;
  onRoute: (id: string) => void;
}) {
  const [month, setMonth] = useState(
    (validDate(date) ? date : DEMO_DATE).slice(0, 7),
  );
  const [view, setView] = useState("Month");
  const [dialog, setDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(date || DEMO_DATE);
  const [time, setTime] = useState("08:00");
  const [kind, setKind] = useState<CalendarEvent["kind"]>("Planning");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [year, index] = month.split("-").map(Number);
  const heading = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, index - 1, 1)));
  const firstDay = new Date(Date.UTC(year, index - 1, 1)).getUTCDay();
  const dayCount = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const days = Math.ceil((firstDay + dayCount) / 7) * 7;
  const changeMonth = (delta: number) =>
    setMonth(
      new Date(Date.UTC(year, index - 1 + delta, 1)).toISOString().slice(0, 7),
    );
  const routes = plan.trips
    .filter((t) => t.depot === depot && t.orderIds.length)
    .map((t) => ({
      id: t.id,
      title: `${t.vehicleId} · ${t.orderIds.length} stops`,
      date: DEMO_DATE,
      time: formatTime(t.departure),
      kind: "Route",
    }));
  const selectedOrders =
    date === DEMO_DATE ? orders.filter((order) => order.depot === depot) : [];
  const selectedTrips =
    date === DEMO_DATE
      ? plan.trips.filter((trip) => trip.depot === depot)
      : [];
  const assignedVehicles = new Set(selectedTrips.map((trip) => trip.vehicleId));
  const availableVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.depot === depot &&
      !vehicle.workshop &&
      !assignedVehicles.has(vehicle.id),
  );
  const blockingTrips = selectedTrips.filter(
    (trip) => validateTrip(trip, plan).length > 0,
  );
  const items = [...state.events, ...routes]
    .filter((e) => e.date.startsWith(month))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  function addEvent() {
    if (
      !title.trim() ||
      title.trim().length > 80 ||
      !validDate(eventDate) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    ) {
      setError("Enter a title, valid date and time.");
      return;
    }
    const event = {
      id: editingId ?? crypto.randomUUID(),
      title: title.trim(),
      date: eventDate,
      time,
      kind,
    };
    if (
      onSave(
        { ...state, events: editingId ? state.events.map(e => e.id === editingId ? event : e) : [...state.events, event] },
        "Calendar event saved locally.",
      )
    ) {
      setMonth(eventDate.slice(0, 7));
      setDialog(false);
      setTitle("");
      setEditingId(null);
      setError("");
    } else
      setError(
        "The event was not saved. Your entries are preserved; try again.",
      );
  }
  return (
    <section
      className="workspace-panel calendar-workspace"
      aria-label="Dispatch calendar"
    >
      <div className="full-calendar-toolbar">
        <div>
          <button
            aria-label="Previous calendar month"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            aria-label="Next calendar month"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            className="workspace-action"
            onClick={() => {
              setEditingId(null);
              setTitle("");
              setEventDate(date || DEMO_DATE);
              setError("");
              setDialog(true);
            }}
          >
            <Plus size={16} /> Add event
          </button>
        </div>
        <h2>{heading}</h2>
        <select
          aria-label="Calendar view"
          value={view}
          onChange={(e) => setView(e.target.value)}
        >
          <option>Month</option>
          <option>Agenda</option>
        </select>
      </div>
      <p className="workspace-note calendar-note">
        A planning calendar with the selected day’s demand and fleet position.
        Forecast drivers will be connected when forecast data is available.
      </p>
      <div className="capacity-outlook-summary" aria-label="Capacity outlook">
        <div>
          <span>Orders</span>
          <strong>{selectedOrders.length}</strong>
          <small>Selected operating day</small>
        </div>
        <div>
          <span>Chilled orders</span>
          <strong>{selectedOrders.filter((order) => order.chilled).length}</strong>
          <small>Reefer demand</small>
        </div>
        <div>
          <span>Vehicles assigned</span>
          <strong>{assignedVehicles.size}</strong>
          <small>{selectedTrips.length} draft trips</small>
        </div>
        <div>
          <span>Vehicles available</span>
          <strong>{availableVehicles.length}</strong>
          <small>Excludes workshop and assigned</small>
        </div>
        <div>
          <span>Constraint blockers</span>
          <strong>{blockingTrips.length}</strong>
          <small>Must resolve before publish</small>
        </div>
      </div>
      <div
        className="calendar-workspace-scroll"
        tabIndex={0}
        role="region"
        aria-label="Calendar grid"
      >
        {view === "Month" ? (
          <>
            <div className="full-calendar-weekdays">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="full-calendar-grid">
              {Array.from({ length: days }, (_, cell) => {
                const key = new Date(
                  Date.UTC(year, index - 1, cell - firstDay + 1),
                )
                  .toISOString()
                  .slice(0, 10);
                const dayItems = items.filter((e) => e.date === key);
                return (
                  <div
                    className={`full-calendar-day${key.startsWith(month) ? "" : " outside-month"}${key === date ? " selected-day" : ""}`}
                    key={key}
                  >
                    <button
                      aria-label={`Choose operating date ${key}`}
                      className="calendar-day-number"
                      onClick={() => onDate(key)}
                    >
                      {Number(key.slice(-2))}
                    </button>
                    {dayItems.map((e) => (
                      <button
                        key={e.id}
                        className={`calendar-event kind-${e.kind.toLowerCase()}`}
                        title={`${e.time} · ${e.title}`}
                        onClick={() => {
                          if (e.kind === "Route") onRoute(e.id);
                          else {
                            setEditingId(e.id);
                            setTitle(e.title);
                            setTime(e.time);
                            setKind(e.kind as CalendarEvent["kind"]);
                            setError("");
                            setEventDate(e.date);
                            setDialog(true);
                          }
                        }}
                      >
                        <span>{e.time}</span>
                        {e.title}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="calendar-agenda">
            {items.length ? (
              items.map((e) => (
                <article key={e.id}>
                  <CalendarDays size={20} />
                  <div>
                    <strong>{e.title}</strong>
                    <span>
                      {e.date} · {e.time} · {e.kind}
                    </span>
                  </div>
                  {e.kind === "Route" ? (
                    <button
                      className="dispatch-text-button"
                      onClick={() => onRoute(e.id)}
                    >
                      Open route
                    </button>
                  ) : (
                    <button
                      aria-label={`Delete event ${e.title}`}
                      onClick={() =>
                        onSave(
                          {
                            ...state,
                            events: state.events.filter(
                              (event) => event.id !== e.id,
                            ),
                          },
                          "Calendar event removed locally.",
                        )
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </article>
              ))
            ) : (
              <div className="workspace-empty">
                <h3>No events this month</h3>
                <p>Add a local planning event, or move to the demo month.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="dispatch-dialog" data-theme={state.theme}>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit calendar event" : "Add calendar event"}</DialogTitle>
            <DialogDescription>
              A local planning note, visible only in this browser.
            </DialogDescription>
          </DialogHeader>
          <label className="workspace-form-field">
            Event title
            <input
              aria-label="Event title"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Vehicle availability review"
            />
          </label>
          <div className="workspace-form-row">
            <label className="workspace-form-field">
              Date
              <input
                type="date"
                aria-label="Event date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </label>
            <label className="workspace-form-field">
              Time
              <input
                type="time"
                aria-label="Event time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
          </div>
          <label className="workspace-form-field">
            Category
            <select
              aria-label="Event category"
              value={kind}
              onChange={(e) => setKind(e.target.value as CalendarEvent["kind"])}
            >
              <option>Planning</option>
              <option>Fleet</option>
              <option>Meeting</option>
            </select>
          </label>
          {error && (
            <p className="workspace-form-error" role="alert">
              {error}
            </p>
          )}
          <button className="workspace-action" onClick={addEvent}>
            Save event locally
          </button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
