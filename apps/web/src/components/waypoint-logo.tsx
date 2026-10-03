import { Waypoints } from "lucide-react";

export function WaypointLogo({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`waypoint-logo${light ? " waypoint-logo-light" : ""}`}
      aria-label="Waypoint delivery planning"
    >
      <span className="waypoint-logo-mark">
        <Waypoints size={25} strokeWidth={2.1} aria-hidden="true" />
      </span>
      <span className="waypoint-logo-type">
        Waypoint<span>Delivery planning</span>
      </span>
    </div>
  );
}
