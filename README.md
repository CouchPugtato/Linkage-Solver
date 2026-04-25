# Linkage Solver

Small browser-based tool for sketching a target path and searching for a linkage that approximates it.

## Run It

Open [index.html](/abs/path/f:/Coding/Repositories/Linkage-Solver/index.html) in a browser.

## Basic Workflow

1. Select `Draw Path` and click-drag on the canvas to sketch the motion you want.
2. Add one or more green `Start Zone` boxes where the grounded pivots are allowed to be.
3. Add blue `Pass Zone` boxes if the linkage should pass through specific areas.
4. Optionally enter `4`, `5`, or `6` in `Linkage Bars` to constrain the solver.
   Leave it blank to let the app search for the best option.
5. Use `Constrained Start` if the entire mechanism must begin inside the green start zone instead of just the grounded pivots.
6. Click `Solve Linkage`.
7. Use the slider or `Play` button to inspect the generated mechanism's path.

## Editing Zones

- Use `Select / Move` to select a zone.
- Drag inside a selected zone to move it.
- Drag the sides or corners of a selected zone to resize it.
- `Delete Selected Zone` removes the current zone.

## Controls

- `S`: select mode
- `D`: draw mode
- `A`: add start zone
- `Z`: add pass zone
- `Del`: delete selected zone
- `Enter`: solve
- `Space`: play/pause
- `Esc`: clear selection or reset work

## Notes

- The solver reports the best match it finds.
- Some paths may not produce a usable mechanism.
