import React, { useEffect, useState } from "react";

import { useConfig } from "../config/useConfig";
import type { TelemetrySnapshot } from "../telemetry";
import { getTelemetryCollector } from "../telemetry";
import { warn } from "../utils/logger";

type TelemetryPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ isOpen, onClose }) => {
  const config = useConfig();
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copying, setCopying] = useState(false);
  const workerRef = React.useRef<Worker | null>(null);

  useEffect(() => {
    if (!isOpen || !config.telemetry.enabled) {
      return;
    }

    const telemetry = getTelemetryCollector();
    const interval = setInterval(() => {
      setSnapshot(telemetry.getSnapshot());
    }, 500); // Update every 500ms

    return () => clearInterval(interval);
  }, [isOpen, config.telemetry.enabled]);

  React.useEffect(() => {
    // Lazily create worker on mount when telemetry panel is used; keep around for lifetime of panel
    const w = new Worker(new URL("../worker/telemetryStringify.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = w;

    const handler = (e: MessageEvent) => {
      const msg = e.data as { t: string; json?: string; message?: string };
      if (msg.t === "DONE") {
        const json = msg.json ?? "";
        navigator.clipboard.writeText(json).then(
          () => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
          },
          () => {
            // Ignore clipboard errors for now
          },
        );
      } else if (msg.t === "ERROR") {
        // Could surface an error toast here; for now just warn
        warn("Telemetry stringify worker error:", msg.message);
      }
      setCopying(false);
    };

    w.addEventListener("message", handler);

    return () => {
      w.removeEventListener("message", handler);
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  const handleCopyJSON = () => {
    if (!snapshot) return;

    // Avoid duplicate copy operations
    if (copying) return;

    setCopying(true);
    // Post snapshot to worker for stringify; worker will post back the string
    try {
      workerRef.current?.postMessage({ t: "STRINGIFY", snapshot });
    } catch (e) {
      // Fallback: stringify on main thread if worker fails
      warn("Worker postMessage failed, falling back to main thread", e);
      setCopying(false);
      try {
        const json = JSON.stringify(snapshot, null, 2);
        navigator.clipboard.writeText(json).then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        });
      } catch (e2) {
        warn("Failed to copy telemetry JSON", e2);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-2 right-2 w-96 max-h-[90vh] overflow-y-auto bg-gray-900/95 text-white text-xs font-mono rounded-lg shadow-2xl border border-gray-700 z-50 pointer-events-auto backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 sticky top-0 bg-gray-900">
        <h3 className="font-bold text-sm">📊 Telemetry</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopyJSON}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
            title="Copy JSON"
            disabled={copying}
          >
            {copying ? "Copying…" : copySuccess ? "✓ Copied" : "Copy JSON"}
          </button>
          <button
            onClick={onClose}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {!snapshot ? (
          <div className="text-gray-400">Collecting metrics...</div>
        ) : (
          <>
            {/* FPS Section */}
            <Section title="FPS">
              <MetricRow label="Current" value={snapshot.fps.current.toFixed(1)} unit="fps" />
              <MetricRow label="Average" value={snapshot.fps.avg.toFixed(1)} unit="fps" />
              <MetricRow
                label="Min/Max"
                value={`${snapshot.fps.min.toFixed(1)} / ${snapshot.fps.max.toFixed(1)}`}
                unit="fps"
              />
            </Section>

            {/* Frame Time Section */}
            <Section title="Frame Time">
              <MetricRow
                label="Current"
                value={snapshot.frameTime.current.toFixed(2)}
                unit="ms"
              />
              <MetricRow label="Average" value={snapshot.frameTime.avg.toFixed(2)} unit="ms" />
              <MetricRow
                label="Min/Max"
                value={`${snapshot.frameTime.min.toFixed(2)} / ${snapshot.frameTime.max.toFixed(2)}`}
                unit="ms"
              />
            </Section>

            {/* DPR Section */}
            <Section title="DPR (Resolution Scale)">
              <MetricRow label="Current" value={snapshot.dpr.current.toFixed(2)} />
              <MetricRow label="Changes" value={snapshot.dpr.changes.toString()} />
              {snapshot.dpr.history.length > 0 && (
                <div className="text-[10px] text-gray-400 mt-1">
                  Recent: {snapshot.dpr.history.slice(-5).map((h) => h.value.toFixed(2)).join(" → ")}
                </div>
              )}
            </Section>

            {/* Meshing Section */}
            <Section title="Meshing">
              <MetricRow
                label="Avg Time/Chunk"
                value={snapshot.meshing.avgTimePerChunk.toFixed(2)}
                unit="ms"
              />
              <MetricRow label="Total Chunks" value={snapshot.meshing.totalChunks.toString()} />
              <MetricRow
                label="Queue"
                value={`${snapshot.meshing.queueLength} (${snapshot.meshing.inFlight} in-flight)`}
              />
              <MetricRow
                label="Avg Wait"
                value={snapshot.meshing.avgWaitTime.toFixed(2)}
                unit="ms"
              />
              {snapshot.meshing.droppedTasks > 0 && (
                <MetricRow
                  label="Dropped"
                  value={snapshot.meshing.droppedTasks.toString()}
                  warning
                />
              )}
              {(snapshot.meshing.errorCount > 0 || snapshot.meshing.retryCount > 0) && (
                <MetricRow
                  label="Errors/Retries"
                  value={`${snapshot.meshing.errorCount} / ${snapshot.meshing.retryCount}`}
                  warning
                />
              )}
            </Section>

            {/* Worker Section */}
            <Section title="Worker">
              <MetricRow label="Sim Time" value={snapshot.worker.simMs.toFixed(2)} unit="ms" />
              <MetricRow label="Backlog" value={snapshot.worker.backlog.toString()} />
              {(snapshot.worker.errorCount > 0 || snapshot.worker.retryCount > 0) && (
                <MetricRow
                  label="Errors/Retries"
                  value={`${snapshot.worker.errorCount} / ${snapshot.worker.retryCount}`}
                  warning
                />
              )}
            </Section>

            {/* Timestamp */}
            <div className="text-[10px] text-gray-500 pt-2 border-t border-gray-800">
              Last update: {new Date(snapshot.timestamp).toLocaleTimeString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div className="space-y-1">
    <div className="text-blue-400 font-semibold text-[11px] uppercase tracking-wide">{title}</div>
    <div className="pl-2 space-y-0.5">{children}</div>
  </div>
);

type MetricRowProps = {
  label: string;
  value: string;
  unit?: string;
  warning?: boolean;
};

const MetricRow: React.FC<MetricRowProps> = ({ label, value, unit, warning }) => (
  <div className="flex justify-between items-baseline">
    <span className="text-gray-400">{label}:</span>
    <span className={warning ? "text-yellow-400 font-semibold" : "text-white"}>
      {value} {unit && <span className="text-gray-500 text-[10px]">{unit}</span>}
    </span>
  </div>
);
