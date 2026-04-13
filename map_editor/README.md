# Map Editor

This folder contains an internal standalone map data builder for Emblitz.

## What It Produces

Given an uploaded SVG/XML map, the tool can generate the exact files used by existing maps:

- `[foldername].txt` (raw SVG/XML map payload)
- `mapdict.json` (territory code -> formal display name)
- `coordadjust.json` (territory code -> `[xOffset, yOffset]`)
- `moves.json` (undirected edge list as `"CODE CODE"`)
- `metadata.json` (`name`, `boundsX`, `boundsY`)

## Quick Start

1. Open `map_editor/index.html` in a browser.
2. Upload a map SVG/XML file.
3. (Optional) Import existing `mapdict.json`, `coordadjust.json`, `moves.json`, and `metadata.json` to prefill editor data.
4. Click shapes in the preview and mark the ones that are playable territories.
5. Set code, name, and label offsets for each territory.
6. Add valid move edges between neighboring territories.
7. Set map metadata and bounds.
8. Generate files and download the zip.

## Notes

- Territory shapes are exported with `data-code` and classes `map-region map-element`.
- Exported SVG roots are normalized to `id="mapsvgbox"` for runtime label/offset calculations.
- Non-territory shapes have those attributes/classes removed during export.
- Auto-detect moves is optional and uses bounding-box proximity; manually review edges.
- Default in-game map scale comes from the SVG `viewBox` in `[foldername].txt`.
- You can manually edit `viewBox` center (`x`, `y`) and size (`width`, `height`) from the Metadata panel.
- The preview now shows a draggable `viewBox` outline with edge/corner handles for interactive move/resize updates.
- Use `Hide/Show ViewBox Outline` to toggle the overlay visibility while keeping current viewBox values.
- `Fit viewBox To Territories` crops the root `viewBox` around marked territories so maps do not render tiny by default.
- `Auto-Center Label Offsets` seeds `coordadjust.json` values from each territory's current rendered size; fine-tune crowded areas manually.
- Bounds are map drag limits in gameplay and may need tuning in-game.
- The importer matches JSON territory codes against SVG shapes by existing `data-code` values.
- Loading `mapdata/<mapname>/<mapname>.txt` now auto-attempts to import sibling `mapdict.json`, `coordadjust.json`, `moves.json`, and `metadata.json` from `mapdata/<mapname>/`.
- A large transparent background rect (for example `fill: rgba(216, 216, 216, 0)`) is treated as an explicit map bounds reference for editor viewBox/bounds workflows.

## Territory Centers Helper

Use `map_editor/territory-centers-console.js` to export territory centers for `scripts/territory_centers.js`.

### How To Use

1. Open either a live game map (preferred) or `map_editor/index.html` with preview labels visible.
2. Open DevTools console.
3. Paste and run the script contents from `map_editor/territory-centers-console.js`.
4. Copy the emitted `let <mapname> = { ... };` block into `scripts/territory_centers.js`.

The script follows troop-label targeting flow and outputs values as `[y, x]`, matching server distance checks.
