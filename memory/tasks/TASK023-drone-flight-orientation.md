# Drone flight orientation

The bundled model's cockpit points along local negative Y. The fallback cone points along positive Y. Body orientation now uses measured movement with a 30-degree pitch limit, retains its heading while stopped, and stays level during vertical lifts. Beam aiming still uses the mining target.

Typecheck, lint, build, and 440 tests passed. A nine-drone Chrome smoke test verified the bundled model used its negative-Y nose and stayed within the pitch limit.
