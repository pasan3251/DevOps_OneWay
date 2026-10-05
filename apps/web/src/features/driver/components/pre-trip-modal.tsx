"use client";

import { useState } from "react";
import { X, CheckSquare, ShieldCheck, Thermometer, Fuel } from "lucide-react";
import type { PreTripChecklist, DriverVehicleTelematics } from "../driver-types";
import { Button } from "@/components/ui/button";

interface PreTripModalProps {
  vehicle: DriverVehicleTelematics;
  onClose: () => void;
  onComplete: (checklist: PreTripChecklist) => void;
}

export function PreTripModal({
  vehicle,
  onClose,
  onComplete,
}: PreTripModalProps) {
  const [tiresOk, setTiresOk] = useState(false);
  const [mirrorsAndLightsOk, setMirrorsAndLightsOk] = useState(false);
  const [lifoSealsVerified, setLifoSealsVerified] = useState(false);
  const [reeferTempVerified, setReeferTempVerified] = useState(!vehicle.chilled);
  const [fuelLevelConfirmed, setFuelLevelConfirmed] = useState(false);

  const allChecked =
    tiresOk &&
    mirrorsAndLightsOk &&
    lifoSealsVerified &&
    reeferTempVerified &&
    fuelLevelConfirmed;

  const handleConfirm = () => {
    onComplete({
      tiresOk,
      mirrorsAndLightsOk,
      lifoSealsVerified,
      reeferTempVerified,
      fuelLevelConfirmed,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="driver-sheet-overlay" role="dialog" aria-modal="true">
      <div className="driver-sheet-content">
        <div className="driver-sheet-handle" />

        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted text-foreground">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Pre-Departure Vehicle Check
              </h2>
              <p className="text-xs text-muted-foreground">
                Vehicle {vehicle.id} ({vehicle.plate})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3 py-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Per Waypoint Group Fleet Safety standard operating procedure, drivers must verify physical vehicle condition, LIFO cargo seals, and reefer temperature before exiting the depot gate.
          </p>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={tiresOk}
                onChange={(e) => setTiresOk(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
              <div className="text-xs">
                <span className="font-bold block text-foreground">
                  Tires, Wheel Nuts & Pressure
                </span>
                <span className="text-muted-foreground text-[11px]">
                  All tires inspected for pressure and tread integrity.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={mirrorsAndLightsOk}
                onChange={(e) => setMirrorsAndLightsOk(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
              <div className="text-xs">
                <span className="font-bold block text-foreground">
                  Mirrors, Headlamps & Indicator Signals
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Side mirrors adjusted and emergency hazard flashers tested.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={lifoSealsVerified}
                onChange={(e) => setLifoSealsVerified(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
              <div className="text-xs">
                <span className="font-bold block text-foreground">
                  Warehouse LIFO Loading & Security Seals
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Cargo staged in reverse stop order. Rear door seal tag verified with Loader.
                </span>
              </div>
            </label>

            {vehicle.chilled && (
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={reeferTempVerified}
                  onChange={(e) => setReeferTempVerified(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded"
                />
                <div className="text-xs">
                  <span className="font-bold block text-foreground flex items-center gap-1.5">
                    <Thermometer size={14} className="text-primary" />
                    Reefer Cooling Sensor: {vehicle.reeferTemperatureC === null ? "Confirm physical gauge" : `${vehicle.reeferTemperatureC.toFixed(1)}°C`} (Target: 2°C - 4°C)
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    Refrigeration unit operating within chilled bounds.
                  </span>
                </div>
              </label>
            )}

            <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={fuelLevelConfirmed}
                onChange={(e) => setFuelLevelConfirmed(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
              <div className="text-xs">
                <span className="font-bold block text-foreground flex items-center gap-1.5">
                  <Fuel size={14} className="text-muted-foreground" />
                  Fuel Quota Allowance: {vehicle.fuelRemainingLiters}L Remaining
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Fuel level sufficient for full round trip + return leg.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-2 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!allChecked}
            onClick={handleConfirm}
            className="flex-1 h-11 bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
          >
            <CheckSquare size={16} />
            Confirm Clearance
          </Button>
        </div>
      </div>
    </div>
  );
}
