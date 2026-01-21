# API & External Integrations

Guiding principles for integrations and external APIs:

- Instantiate clients outside hot paths and inject for testability.
- Never hardcode secrets; use env vars and secure storage.
- Normalize and validate external responses (schemas/type guards).
- Apply retries, exponential backoff, and cancellation tokens for network calls.
- Map external errors to meaningful domain errors and log via telemetry.
- Add integration tests or contract tests when the integration is critical.

Security checklist:

- Use parameterized queries for DB access.
- Sanitize inputs before rendering or passing to downstream systems.
- Use vetted crypto libraries and rotate keys/secrets regularly.
