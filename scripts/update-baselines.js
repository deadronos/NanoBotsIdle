import { spawnSync } from "child_process";

console.log("Running visual-diff test in baseline update mode...");
const res = spawnSync(
  "npm",
  ["test", "--silent", "--", "tests/visual-diff.test.ts", "-t", "visual"],
  {
    stdio: "inherit",
    env: { ...process.env, UPDATE_BASELINE: "1" },
  },
);
process.exit(res.status ?? 0);
