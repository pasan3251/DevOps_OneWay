"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DriverRouteData } from "../driver-types";

interface DriverRouteMapProps {
  route: DriverRouteData;
  activeStopId?: string;
  onOpenStop: (stopId: string) => void;
}

export function DriverRouteMap({
  route,
  activeStopId,
  onOpenStop,
}: DriverRouteMapProps) {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const openStopRef = useRef(onOpenStop);
  const [loading, setLoading] = useState(true);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    openStopRef.current = onOpenStop;
  }, [onOpenStop]);

  const signature = JSON.stringify({ route, activeStopId });

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;

    import("leaflet")
      .then((L) => {
        if (disposed || !element.current) return;
        const data = JSON.parse(signature) as {
          route: DriverRouteData;
          activeStopId?: string;
        };
        setLoading(false);
        setTileError(false);

        const map = L.map(element.current, {
          zoomControl: true,
          scrollWheelZoom: false,
          attributionControl: true,
        });
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
          if (!disposed) setTileError(true);
        });
        tiles.addTo(map);

        const pin = (label: string, state: string) =>
          L.divIcon({
            className: "driver-map-pin",
            html: `<span class="${state}">${label}</span>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

        const depotPoint: [number, number] = [
          data.route.depotCoordinates.lat,
          data.route.depotCoordinates.lng,
        ];
        const stopPoints: [number, number][] = data.route.stops.map((stop) => [
          stop.coordinates.lat,
          stop.coordinates.lng,
        ]);
        const points: [number, number][] = [depotPoint, ...stopPoints];
        const routeLine =
          data.route.shiftStatus === "returning" ||
          data.route.shiftStatus === "completed"
            ? [...points, depotPoint]
            : points;

        L.polyline(routeLine, {
          color: "#171717",
          weight: 4,
          opacity: 0.86,
          dashArray: "9 7",
        }).addTo(map);

        L.marker(depotPoint, {
          icon: pin("D", "depot"),
          title: `${data.route.depot} depot`,
        })
          .addTo(map)
          .bindTooltip(`${data.route.depot} depot`);

        data.route.stops.forEach((stop) => {
          const isComplete =
            stop.status === "delivered" ||
            stop.status === "partial" ||
            stop.status === "exception";
          const state =
            stop.id === data.activeStopId
              ? "active"
              : isComplete
                ? "complete"
                : "pending";
          L.marker([stop.coordinates.lat, stop.coordinates.lng], {
            icon: pin(String(stop.sequence), state),
            title: stop.outlet,
          })
            .addTo(map)
            .bindTooltip(`${stop.sequence}. ${stop.outlet}`)
            .on("click", () => openStopRef.current(stop.id));
        });

        if (points.length > 1) {
          map.fitBounds(L.latLngBounds(points), {
            padding: [32, 32],
            maxZoom: 13,
          });
        } else {
          map.setView(depotPoint, 12);
        }

        observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(element.current);
      })
      .catch(() => {
        if (!disposed) {
          setLoading(false);
          setTileError(true);
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
    <section className="driver-route-map" aria-label="Assigned delivery route map">
      <div ref={element} className="driver-route-map-canvas" />
      {loading && (
        <div className="driver-map-message" role="status">
          Loading assigned route…
        </div>
      )}
      {tileError && !loading && (
        <div className="driver-map-warning" role="status">
          Basemap unavailable. The assigned stop sequence remains available below.
        </div>
      )}
    </section>
  );
}
