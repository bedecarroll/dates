<!--
AGENTS.md: Guidance for automated agents (LLMs) working with this template repository.
--> 
# AGENTS

## Overview
This template provides a static, client-side date/time converter web application.  
All functionality (parsing, formatting, UI interactions) runs entirely in the user's browser.  
There is no server-side code or API; the build produces plain HTML, CSS, and JavaScript assets.

LLM agents should use this file to understand project conventions, file structure, and build/deploy steps.

## Repository Structure
  template/                    # Template root
  ├── index.html               # HTML entry point with placeholders {{projectTitle}}, {{projectDescription}}
  ├── styles.css               # Styling (light/dark theme, layout)
  ├── src/                     # TypeScript source
  │   ├── main.ts              # Application logic and UI wiring
  │   ├── dateTimeConverter.ts # Parsing and formatting utilities
  │   └── autocomplete.ts      # Autocomplete input widget
  ├── package.json             # NPM scripts: build, dev, serve, serve:python
  ├── tsconfig.json            # TypeScript compiler configuration
  ├── LICENSE                  # MIT license text
  └── README.md                # User instructions for customizing the template

## Placeholders
- **package.json**: replace `{{projectSlug}}`, `0.1.0`, and `{{projectDescription}}`.  
- **index.html**: replace `{{projectTitle}}` and `{{projectDescription}}` in the `<title>` and header text.

## Build & Development Workflow
1. Run `npm install` to install TypeScript and any tooling.
2. `npm run build`:
   - Compiles TS → JS into `dist/`.
   - Assembles `public/` directory with `index.html`, `styles.css`, and `dist/`.
3. Serve static files from `public/`:
   - `npm run serve` (requires `serve` package globally or locally).
   - `npm run serve:python` starts a simple Python HTTP server.
4. For iterative development: `npm run dev` watches TS changes and recompiles.

## Guidelines for LLM Agents
- Do not introduce server-side code; maintain a pure static asset approach.
- Focus on modifying HTML, CSS, or TS files under `src/` and updating placeholders.
- After changes, run the build script to verify output integrity.
- Ensure new features or fixes do not break the zero-dependency, client-only design.
- Any new dependencies must run in the browser (avoid Node-only modules).

---
*This AGENTS.md is intended for automated agents and code reviewers to understand how to work with the template.*
