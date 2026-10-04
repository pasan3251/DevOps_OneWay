"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { orders, type Depot, type Trip } from "./planning";

// Illustrative town-level seed positions, never organizer or real outlet addresses.
export const demoPositions: Record<string, [number, number]> = {
  Peliyagoda: [6.964, 79.889],
  Kandy: [7.291, 80.638],
  "ORD-1041": [6.915, 79.878],
  "ORD-1042": [6.869, 79.89],
  "ORD-1043": [6.874, 79.861],
  "ORD-1044": [6.899, 79.854],
  "ORD-1045": [6.851, 79.865],
  "ORD-1046": [7.208, 79.84],
  "ORD-2041": [7.324, 80.625],
  "ORD-2042": [7.263, 80.596],
};
type Props = {
  depot: Depot;
  trips: Trip[];
  focusedOrder?: string | null;
  selectedTrip?: string;
  onTrip?: (id: string) => void;
  onOrder?: (id: string) => void;
};
export function RouteMap({
  depot,
  trips,
  focusedOrder,
  selectedTrip,
  onTrip,
  onOrder,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const callbacks = useRef({ onTrip, onOrder });
  useEffect(() => {
    callbacks.current = { onTrip, onOrder };
  }, [onTrip, onOrder]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const signature = JSON.stringify({
    depot,
    trips: trips.map((t) => ({
      id: t.id,
      vehicleId: t.vehicleId,
      orderIds: t.orderIds,
    })),
    focusedOrder,
    selectedTrip,
  });
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    import("leaflet")
      .then((L) => {
        if (disposed || !element.current) return;
        setError(false);
        const data: {
          depot: Depot;
          trips: Trip[];
          focusedOrder?: string;
          selectedTrip?: string;
        } = JSON.parse(signature);
        const map = L.map(element.current, {
          scrollWheelZoom: false,
          zoomControl: true,
        }).setView(demoPositions[data.depot], 11);
        mapRef.current = map;
        const tiles = L.tileLayer(
          process.env.NEXT_PUBLIC_MAP_TILE_URL ||
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 18,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        );
        tiles.on("tileerror", () => {
          if (!disposed) setError(true);
        });
        tiles.addTo(map);
        const pin = (text: string, active = false) =>
          L.divIcon({
            className: "waypoint-map-pin",
            html: `<span class="${active ? "active" : ""}">${text}</span>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
        const depotMarker = L.marker(demoPositions[data.depot], {
          icon: pin("D", true),
          title: `${data.depot} demo depot`,
        })
          .addTo(map)
          .bindTooltip(`${data.depot} · illustrative depot`);
        const points: [number, number][] = [demoPositions[data.depot]];
        data.trips.forEach((trip, index) => {
          const route = [
            demoPositions[data.depot],
            ...trip.orderIds.map((id) => demoPositions[id]).filter(Boolean),
          ];
          L.polyline(route, {
            color: trip.id === data.selectedTrip ? "#1765ab" : "#247a70",
            weight: trip.id === data.selectedTrip ? 5 : 3,
            dashArray: "8 6",
          })
            .addTo(map)
            .bindTooltip(`${trip.id} · ${trip.vehicleId}`)
            .on("click", () => callbacks.current.onTrip?.(trip.id));
          trip.orderIds.forEach((id, stop) => {
            const order = orders.find((o) => o.id === id);
            if (!order || !demoPositions[id]) return;
            points.push(demoPositions[id]);
            L.marker(demoPositions[id], {
              icon: pin(String(stop + 1), id === data.focusedOrder),
              title: `${order.outlet} · ${trip.id}`,
            })
              .addTo(map)
              .bindTooltip(order.outlet)
              .on("click", () => callbacks.current.onOrder?.(id));
          });
          if (route.length > 1)
            L.marker([(route[0][0] + route[1][0]) / 2, (route[0][1] + route[1][1]) / 2], {
              icon: pin(`T${index + 1}`, trip.id === data.selectedTrip),
              title: `Select ${trip.id}`,
            })
              .addTo(map)
              .bindTooltip(`${trip.vehicleId} · ${trip.id}`)
              .on("click", () => callbacks.current.onTrip?.(trip.id));
        });
        if (data.focusedOrder && demoPositions[data.focusedOrder]) {
          const point = demoPositions[data.focusedOrder];
          L.marker(point, { icon: pin("•", true), title: "Selected outlet" })
            .addTo(map)
            .bindTooltip(
              orders.find((o) => o.id === data.focusedOrder)?.outlet ??
                "Selected outlet",
            )
            .openTooltip();
          map.setView(point, 13);
        } else if (points.length > 1)
          map.fitBounds(L.latLngBounds(points), {
            padding: [35, 35],
            maxZoom: 13,
          });
        else depotMarker.openTooltip();
        observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(element.current);
        setLoading(false);
      })
      .catch(() => {
        if (!disposed) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [signature]);
  return (
    <section className="route-map-panel" aria-label="Illustrative route map">
      <div className="route-map-canvas" ref={element} />
      {loading && (
        <p className="map-loading" role="status">
          Loading route preview…
        </p>
      )}
      <p className="route-map-note">
        Illustrative pins · lines show stop sequence, not road directions.
      </p>
      {error && (
        <p className="map-warning" role="status">
          Basemap unavailable. Route pins remain usable; check your connection.
        </p>
      )}
      <div className="map-location-links">
        <button
          onClick={() => {
            mapRef.current?.setView(demoPositions[depot], 12);
          }}
        >
          Focus {depot} depot
        </button>
        {focusedOrder && <span>Selected: {focusedOrder}</span>}
      </div>
    </section>
  );
}
