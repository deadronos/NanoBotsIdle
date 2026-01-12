/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */
// Worker to offload heavy JSON.stringify for telemetry snapshots

self.addEventListener("message", (e) => {
  const msg = e.data;
  if (!msg || msg.t !== "STRINGIFY") return;

  try {
    // Use structured clone-friendly snapshot (already plain object)
    const json = JSON.stringify(msg.snapshot, null, 2);
    // Post result back to main thread
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (self as any).postMessage({ t: "DONE", json });
  } catch (err) {
    (self as any).postMessage({ t: "ERROR", message: String(err) });
  }
});
