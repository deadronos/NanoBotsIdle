# Requirements

## LOD, Occlusion, and Benchmarking

1. WHEN occlusion culling is enabled in configuration and WebGL2 is available, THE SYSTEM SHALL evaluate occlusion after frustum/LOD visibility and hide meshes marked occluded. [Acceptance: unit/integration tests validate occluded meshes are hidden only when previously visible.]
2. WHEN progressive LOD is enabled, THE SYSTEM SHALL apply coarse (low) LOD first for newly visible meshes and upgrade to high LOD only after the configured refine delay. [Acceptance: tests cover delayed high-LOD promotion and immediate downgrades.]
3. WHEN the benchmark scene preset is enabled, THE SYSTEM SHALL request a larger meshed-chunk neighborhood without changing default behavior. [Acceptance: tests validate configured radius values are used for chunk requests.]
4. WHEN the profiling script runs, THE SYSTEM SHALL emit FPS and draw-call metrics for the active scene in the output JSON. [Acceptance: benchmark output includes draw-call stats alongside FPS stats.]
