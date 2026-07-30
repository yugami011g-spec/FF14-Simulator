# AGENTS.md

## Project Overview

This project is a lightweight FF14 skill rotation simulator.
It currently runs as a simple static web app using HTML, CSS, and JavaScript.

The goal is to let users test skill rotations, combo success, potency totals, and timing-based mechanics such as GCD, recast timers, animation lock, buffs, debuffs, DoTs, and job gauges.

## Current Product Direction

- The first supported job is Reaper.
- The simulator should be designed as a timeline-based rotation simulator.
- The UI may start as a simple button-driven interface, but the internal state should track elapsed time from the beginning.
- Potency totals should add the potency configured on each action. Do not attempt full damage formula simulation yet.
- Future real-damage simulation with character stats may be interesting, but it is out of scope for the current core simulator.
- Use current patch action data when adding real FF14 values. Confirm the target patch version before entering exact action values.

## Language

- Use Japanese for user-facing text.
- Keep code identifiers in English.
- Keep comments short and clear.
- Avoid mojibake. Save files as UTF-8.

## Tech Stack

- HTML
- CSS
- JavaScript
- No build step is required for the current MVP.
- Do not add frameworks or package managers unless there is a clear need.

## Project Structure

- `index.html`: Main page structure.
- `css/style.css`: Visual styling and responsive layout.
- `js/skills.js`: Skill data.
- `js/state.js`: Shared simulator state.
- `js/engine.js`: Simulation and calculation logic.
- `js/ui.js`: Rendering and UI event handling.
- `PLAN.md`: Development plan and feature priorities.

## Development Principles

1. Keep the app working after every change.
2. Prefer small, focused updates over large rewrites.
3. Preserve the current static web app structure unless the task requires a bigger change.
4. Separate skill data, state, calculation logic, and UI rendering.
5. Make skill data easy to extend for additional jobs.
6. Favor readable code over clever code.
7. Match FF14 behavior gradually instead of attempting full accuracy all at once.

## Current Priorities

1. Fix mojibake in Japanese text and comments.
2. Improve the MVP UI labels.
3. Add a reset button.
4. Clean up skill data shape.
5. Add timeline and elapsed time handling.
6. Add GCD and recast handling.
7. Add Reaper-specific gauges and action rules.
8. Add buffs, debuffs, DoTs, and animation lock handling.
9. Add additional job-specific skill sets after Reaper is useful.

## Simulation Rules

- Potency calculation should be deterministic.
- Combo success should depend on the current combo state.
- The simulator should treat elapsed time as core state.
- Skill history should record the timestamp of each action.
- GCD actions should advance or lock time according to the current simplified timing model.
- Abilities should be modeled separately from weaponskills so weaving rules can be added gradually.
- Invalid skill IDs should fail safely without changing state.
- State changes should be recorded in history.
- UI should render from state rather than storing separate UI-only truth.

## UI Guidelines

- The first screen should be the simulator itself, not a landing page.
- Keep controls clear and compact.
- Make buttons large enough to use comfortably.
- Make the history log easy to scan.
- Support mobile layouts.
- Do not add decorative UI that makes the simulator harder to use.

## Change Scope Rules

- Change only the files needed for the requested task.
- Do not refactor unrelated code while working on a focused change.
- Do not change existing behavior unless the task explicitly requires it.
- Preserve the current file structure unless there is a clear project benefit.
- If a larger change becomes necessary, explain why before expanding the scope.

## Browser Verification Rules

- After UI changes, verify the app in a browser when possible.
- Because this is a static app, open `index.html` directly in a browser for manual verification.
- Check both desktop-sized and mobile-sized layouts.
- Confirm that Japanese text displays without mojibake.
- Confirm that buttons, status values, and history entries do not overlap.
- Confirm that changed controls can be clicked or used as expected.
- Summarize what was visually checked after the work is complete.

## Testing and Verification

After changes, verify the following manually:

1. The page loads without errors.
2. Skill buttons render.
3. Clicking a skill updates total potency.
4. Combo skills use combo potency only when the combo condition is met.
5. History entries are added in order.
6. Reset or undo features work if they were changed.
7. Japanese text displays correctly.

## Work Logs

- Create a `.logs/` directory when a task has multiple steps or important design decisions.
- Record major changes, decisions, and verification results in a dated log file.
- Keep logs short and practical.
- Use logs as handoff notes for future sessions.

## Plan Updates

- Update `PLAN.md` when implementation progress, priorities, scope, or unresolved decisions change.
- Keep `PLAN.md` concise and practical.
- Do not update `PLAN.md` for tiny code-only fixes that do not affect the roadmap.
- If a task completes or changes an item listed in `PLAN.md`, update that section so future work starts from the current state.

## Scope Notes

- Do not attempt to support every FF14 job at once.
- Start with Reaper and expand from there.
- When FF14 data is needed, confirm the target patch version before implementing exact values.
- If exact official values are uncertain, mark them as provisional instead of guessing silently.
- For Reaper, prioritize Soul Gauge, Shroud Gauge, Lemure Shroud, Void Shroud, combo flow, and burst-window timing after basic elapsed time and recast handling exist.

## Recommended Next Task

Implement the first timeline-based state model for the Reaper MVP: elapsed time, timestamped history, GCD handling, and recast-ready display.
