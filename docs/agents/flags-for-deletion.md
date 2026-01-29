# Candidate Instructions to Delete or Consolidate

These lines across the instructions are either redundant, too vague, or not actionable and are good candidates for removal or consolidation:

- Generic lines such as "write clean code" / "Prioritize maintainability and clarity" — too obvious and redundant with more specific guidance; replace with concrete examples.
- "Use `React.FC`" — the repository keeps `React.FC` guidance; instead of deleting, document recommended usage patterns to avoid typing surprises.
- Broad statements like "follow React's official style guide" without linking to the specific rules used by the repo.
- Duplicate TDD/procedural guidance consolidated into the Spec-Driven Workflow doc; update remaining files to reference the canonical workflow instead of duplicating steps.

If you want, I can open PR changes removing these lines and consolidating their actionable parts into the relevant focused docs above.
