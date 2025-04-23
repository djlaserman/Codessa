# Settings UI Module Structure

This folder contains all files related to the unified settings panel for Codessa. The code is split by type, context, and source, with clear hierarchies matching the code for which those settings are for. All settings UI remains unified for a seamless user experience.

## Structure
- `index.ts`: Main entry point for the settings panel (was `allSettingsPanel.ts`).
- `sections/`: Contains grouped UI logic and rendering for each major settings category (e.g., Providers & Models, Agents, Workflows, Memory, UI/Theme, General, Advanced, etc.).
- `handlers/`: Backend and VS Code message/event handlers for each settings category.
- `components/`: Reusable UI components (modals, tables, forms, etc.).
- `types.ts`: Shared types/interfaces for settings.

## Expansion
- Each section/component/handler can be expanded independently, but the UI remains unified.
- Follow the hierarchy and naming conventions for clarity and maintainability.

---
