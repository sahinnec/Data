# Data Show – code structure

`app/src/main/assets/index.html` was one 584 KB file. It is now split into plain
CSS/JS files. **No logic was rewritten**: the code is the same, only moved.
There is still no build step (no npm, no bundler); files are normal `<script>` /
`<link>` tags, so all top-level names stay global exactly as before.

```
assets/
  index.html              page markup + <link>/<script> tags (load order matters)
  css/
    base.css              main theme and layout
    tools.css             Tools screen
    card-styles.css       card style variants
    preview.css           preview box, camera, video, reader, panels
    daily-cards.css       daily / future cards
    live-table.css        live DSE price table
  js/
    seed-demo.js          demo data on first run (runs first, in <head>)
    core/state-libs.js    global state, lazy library loader (libs/)
    data/import.js        file import and parsers (xlsx, pdf, docx, csv, json, paste)
    data/rows.js          row cleaning, dates, header detection, sorting
    cards/engine.js       card engine, daily/future cards, layout options
    cards/design.js       design, theme, fields, presets
    pages/compare-show.js tabs, Compare, Cards page, charts, Buy/Sell typing
    pages/projects.js     projects, merge, Files list, main render()
    export/export.js      share, image/PDF export
    docs/library.js       stored originals (IndexedDB), file library, + menu, viewer
    pages/selection-customize.js  row selection, Customize panel, startup restore
    app/files-page.js     Files page, bottom nav, scan/preview box, web link, share
    app/tools-grid.js     Tools grid
    app/home-layout.js    show/hide Home sections
    app/updater-button.js update button
    app/nav-home.js       Home/Files tab behaviour
    app/notes.js          Notes
    app/pdf-reader.js     PDF reader/editor
    app/photo-editor.js   opens the photo editor (HTML for it is `#peSrc` in index.html)
    app/live-table.js     live DSE price table
    app/portfolio.js      My portfolio (Table page): portfolio PDF, Buy/Sell PDF, Gmail import, Send to Cards
  libs/                   third-party libraries (pdf.js, xlsx, jspdf, jszip, qr)
```

## Rules
1. **Load order = order of the tags in `index.html`.** A file may use functions
   from files above it at load time. Functions used only inside event handlers can
   live anywhere. Example: `docs/library.js` must load before
   `pages/selection-customize.js`, because startup calls `merge()` → `renderLibrary()`.
2. Top-level `let/const/function` are shared by all files (same as the old single script).
3. `#peSrc` (the photo editor's own HTML page, ~95 KB) is kept inline at the bottom of
   `index.html` because `photo-editor.js` reads it with `getElementById('peSrc').textContent`.
4. Never inline `libs/*` into `index.html`.

## Checks used for this split
- `node --check` on every JS file.
- Headless Chrome, original vs split: same number of CSS rules and selectors, same set of
  global names, same startup state, same result of clicking every visible button on all
  pages, zero page errors.

## In-app update (PatchEngine)
`@@WRITE js/app/notes.js … @@END` and `@@FILE js/cards/engine.js` now work on the module
files. Old patch files that use `@@FILE index.html` + `@@FIND <code>` target the old
single file and will not match any more; re-aim them at the module that holds the code.
Updated files are served by `Updater.intercept`; `index.html` is passed to the WebView
directly. Check on a real phone before relying on it for `.js`/`.css` files.
