"use client";

import { ArrowRight, Plus, Route, ShieldCheck } from "lucide-react";
import {
  formatTime,
  stopTimes,
  validateTrip,
  type Plan,
  type Trip,
} from "./planning";
import { tripDescription } from "./dispatch-operations";

export function RouteSchedule({
  trips,
  plan,
  selectedId,
  published,
  onSelect,
  onCreate,
}: {
  trips: Trip[];
  plan: Plan;
  selectedId?: string;
  published: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <section className="route-schedule" aria-label="Route schedule">
      <div className="route-schedule-heading">
        <div>
          <Route size={18} aria-hidden="true" />
          <h2>
            Today’s routes <span>{trips.length}</span>
          </h2>
        </div>
        <button
          className="dispatch-text-button"
          disabled={published}
          onClick={onCreate}
        >
          <Plus size={16} />
          New trip
        </button>
      </div>
      <div className="route-schedule-list">
        {trips.map((trip) => {
          const issues = validateTrip(trip, plan);
          return (
            <button
              key={trip.id}
              className={selectedId === trip.id ? "is-selected" : ""}
              aria-label={`Select route ${trip.id}`}
              aria-pressed={selectedId === trip.id}
              onClick={() => onSelect(trip.id)}
            >
              <span>
                <strong>
                  {trip.id} · {trip.vehicleId}
                </strong>
                <small>{tripDescription(trip)}</small>
              </span>
              <span>
                {trip.orderIds.length} stops
                <small>
                  {formatTime(trip.departure)}–
                  {formatTime(stopTimes(trip).at(-1)?.end ?? trip.departure)}
                </small>
              </span>
              <span
                className={`route-check-label${issues.length ? " has-issues" : ""}`}
              >
                <ShieldCheck size={14} />
                {issues.length ? `${issues.length} checks` : "Checks pass"}
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          );
        })}
        {!trips.length && (
          <p>No routes yet. Create a trip to begin allocating orders.</p>
        )}
      </div>
    </section>
  );
}
