"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { orders, vehicles, type Depot, type Trip } from "./planning";

type Coordinates = [number, number];
type Props = {
  depot: Depot;
  trips: Trip[];
  focusedOrder?: string | null;
  selectedTrip?: string;
  currentLocation?: { coordinates: Coordinates; recordedAt: string } | null;
  onTrip?: (id: string) => void;
  onOrder?: (id: string) => void;
};

function validCoordinates(value?: Coordinates): value is Coordinates {
  return !!value && Number.isFinite(value[0]) && Number.isFinite(value[1]) &&
    Math.abs(value[0]) <= 90 && Math.abs(value[1]) <= 180;
}

export function RouteMap({ depot, trips, focusedOrder, selectedTrip, currentLocation, onTrip, onOrder }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const callbacks = useRef({ onTrip, onOrder });
  useEffect(() => { callbacks.current = { onTrip, onOrder }; }, [onTrip, onOrder]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const depotCoordinates = vehicles.find((vehicle) => vehicle.depot === depot)?.depotCoordinates;
  const routes = trips.map((trip) => ({
    id: trip.id, vehicleId: trip.vehicleId,
    stops: trip.orderIds.flatMap((id) => {
      const order = orders.find((item) => item.id === id);
      return order && validCoordinates(order.coordinates) ? [{ id, label: order.outlet, coordinates: order.coordinates }] : [];
    }),
  }));
  const signature = JSON.stringify({ depot, depotCoordinates, routes, focusedOrder, selectedTrip, currentLocation });
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    import("leaflet").then((L) => {
      if (disposed || !element.current) return;
      setError(false);
      const data: {
        depot: Depot; depotCoordinates?: Coordinates; routes: typeof routes;
        focusedOrder?: string; selectedTrip?: string; currentLocation?: Props["currentLocation"];
      } = JSON.parse(signature);
      if (!validCoordinates(data.depotCoordinates)) { setLoading(false); return; }
      const map = L.map(element.current, { scrollWheelZoom: false, zoomControl: true })
        .setView(data.depotCoordinates, 11);
      mapRef.current = map;
      const tiles = L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL ||
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      tiles.on("tileerror", () => { if (!disposed) setError(true); });
      tiles.addTo(map);
      const pin = (text: string, active = false) => L.divIcon({
        className: "waypoint-map-pin",
        html: `<span class="${active ? "active" : ""}">${text}</span>`,
        iconSize: [28, 28], iconAnchor: [14, 14],
      });
      const label = (text: string) => { const node = document.createElement("span"); node.textContent = text; return node; };
      const depotMarker = L.marker(data.depotCoordinates, { icon: pin("D", true), title: `${data.depot} depot` })
        .addTo(map).bindTooltip(label(`${data.depot} depot`));
      const points: Coordinates[] = [data.depotCoordinates];
      for (const route of data.routes) {
        const path: Coordinates[] = [data.depotCoordinates, ...route.stops.map((stop) => stop.coordinates), data.depotCoordinates];
        if (route.stops.length) L.polyline(path, {
          color: route.id === data.selectedTrip ? "#171717" : "#737373",
          weight: route.id === data.selectedTrip ? 5 : 3, dashArray: "8 6",
        }).addTo(map).bindTooltip(label(`${route.id} · ${route.vehicleId}`))
          .on("click", () => callbacks.current.onTrip?.(route.id));
        route.stops.forEach((stop, index) => {
          points.push(stop.coordinates);
          L.marker(stop.coordinates, { icon: pin(String(index + 1), stop.id === data.focusedOrder), title: stop.label })
            .addTo(map).bindTooltip(label(stop.label)).on("click", () => callbacks.current.onOrder?.(stop.id));
        });
      }
      if (data.currentLocation && validCoordinates(data.currentLocation.coordinates)) {
        points.push(data.currentLocation.coordinates);
        L.marker(data.currentLocation.coordinates, { icon: pin("V", true), title: "Last recorded vehicle location" })
          .addTo(map).bindTooltip(label(`Vehicle location recorded ${new Date(data.currentLocation.recordedAt).toLocaleString()}`));
      }
      const focused = data.routes.flatMap((route) => route.stops).find((stop) => stop.id === data.focusedOrder);
      if (focused) {
        L.marker(focused.coordinates, { icon: pin("•", true), title: "Selected outlet" })
          .addTo(map).bindTooltip(label(focused.label)).openTooltip();
        map.setView(focused.coordinates, 13);
      } else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [35, 35], maxZoom: 13 });
      else depotMarker.openTooltip();
      observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(element.current);
      setLoading(false);
    }).catch(() => { if (!disposed) { setError(true); setLoading(false); } });
    return () => { disposed = true; observer?.disconnect(); mapRef.current?.remove(); mapRef.current = null; };
  }, [signature]);

  return <section className="route-map-panel" aria-label="Assigned route map">
    <div className="route-map-canvas" ref={element} />
    {loading && <p className="map-loading" role="status">Loading route map…</p>}
    {!validCoordinates(depotCoordinates) && <p className="map-loading" role="status">Depot coordinates are unavailable.</p>}
    <p className="route-map-note">Registered outlet locations · lines show stop sequence, not road directions.</p>
    {error && <p className="map-warning" role="status">Map unavailable. Check your connection; stop details remain available.</p>}
    <div className="map-location-links">
      <button disabled={!validCoordinates(depotCoordinates)} onClick={() => {
        if (validCoordinates(depotCoordinates)) mapRef.current?.setView(depotCoordinates, 12);
      }}>Focus {depot} depot</button>
      {focusedOrder && <span>Selected outlet</span>}
    </div>
  </section>;
}
