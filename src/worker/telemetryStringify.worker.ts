/// <reference lib="webworker" />
// Worker to offload heavy JSON.stringify for telemetry snapshots

self.addEventListener("message", (e: MessageEvent) => {
  const msg = e.data as { t?: string; snapshot?: unknown };
  if (!msg || msg.t !== "STRINGIFY") return;

  try {
    // Use structured clone-friendly snapshot (already plain object)
    const json = JSON.stringify(msg.snapshot, null, 2);
    self.postMessage({ t: "DONE", json });
  } catch (err) {
    self.postMessage({ t: "ERROR", message: String(err) });
  }
});
