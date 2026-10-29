# Data Show (Android app)

Android WebView app. All UI and logic live in `app/src/main/assets/` (`index.html`, `css/`, `js/`, `libs/`).
More: [ARCHITECTURE.md](ARCHITECTURE.md) (code layout), [MANUAL.md](MANUAL.md) (Part 1: full user guide, Part 2: developer handoff).

Version 1 (first release): `versionName "1"`, `versionCode 1`.

## Main features

- **Bottom menu on every page:** Files, Cards, Add (+), Table, Compare. The small handle below hides or shows it.
- **Files page:** search, Import / Paste boxes, Tools grid (Note, Doodle and more), Export (Excel / PDF), recent files and folders, built-in viewers for PDF, Excel / CSV, text and DOCX.
- **Add (+) menu:** QR code, ID card, PDF, Photo, Import files, New folder, Paste data, Add card. Results appear in the Preview box; the send button (➤) puts the data into the app.
- **Website box:** paste a link to open it in the in-app browser. Smart Selection can select a table, row, column or paragraph and send it to Data Show.
- **Cards:** 8 layouts and 12 card styles, with Fields, Size and Colors options for each layout. Total / Average card with monthly gain and loss, running T.Amt and T.Avg, gain methods, pinned top buttons.
- **Table:** grid table with sort and column picker; styles Grid, Data bars, Heatmap. Tabs: My data, Portfolio, Daily data (live DSE price table with auto refresh, filters, column order and auto fill of Sector, Category, EPS, NAV, ROE, dividend and risk score).
- **Portfolio:** reads broker portfolio statements and buy / sell PDFs (including from Gmail), keeps one portfolio at a time, and never double-counts a re-uploaded statement.
- **Compare:** compare by Name / Date / Month / Buy-Sell / any column, split by, many measures, chart gallery (Table, Heatmap, Scorecard, Column, Bar, Line, Area, Pie, Donut, Scatter, Side by side).
- **Projected:** chart and forecast page (candles, indicators, patterns), a 15-point technical checklist, fundamental checklist, fair value input and a projected price with entry and exit levels. Data comes from the app, from the Preview (➤ Send) or by paste. It is educational only, not financial advice.
- **Notes, photo editor, QR / barcode scan, in-app camera, share (Excel / PDF / text).**
- The app remembers the current tab and the Projected page for 30 minutes if Android restarts it (for example after the in-app browser).

## Build the APK with GitHub (no Android Studio)

1. Create a GitHub account and a **New repository** (Private is fine).
2. Click **uploading an existing file**, drag in **all files and folders inside the zip** (not the zip itself), then **Commit changes**.
3. If the `.github` folder did not upload: **Add file > Create new file**, name it `.github/workflows/build.yml` and paste the contents of that file from this zip.
4. Open the **Actions** tab, choose **Build APK**, press **Run workflow**.
5. After 5 to 10 minutes (green check), open the run and download `DataShow-apk` under **Artifacts**. Unzip it to get `app-debug.apk`.

Every push to `main` also builds the APK and publishes it under **Releases**, so it can be downloaded straight from the phone.

`app/debug.keystore` must stay in the repository. It signs every build with the same key, so a new APK installs over the old one without uninstalling.

## Build with Android Studio

1. Install the latest Android Studio and unzip the project.
2. **File > Open** the project folder and wait for the Gradle sync (internet needed).
3. **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. The APK is at `app/build/outputs/apk/debug/app-debug.apk`.

Command line: `./gradlew assembleDebug` (JDK 17).

On the phone, allow "install from unknown sources" if asked. Android 9 and below ask for storage permission the first time a file is saved.

## In-app update (change the front end without rebuilding the APK)

Open **Customize > App > Update app**. Menu:

| Item | What it does |
|---|---|
| Update from file | Apply a zip or txt update file from the phone |
| Paste update code | Paste an update code you copied |
| Undo last update | Revert the last update |
| Save updated files | Save the changed files as a zip in Downloads (to keep them in GitHub) |
| Reset to original | Back to the APK's original files |

A wrong update (text not found and so on) changes nothing and shows the reason. If the app does not start after an update, an "App did not load" dialog appears after 8 seconds with an **Undo update** button. Saved data (projects, theme) is never deleted by an update.

### Update file formats

**1) Patch text (only the changed part):**
```
#SRUPDATE
@@VERSION button colour change
@@FILE index.html
@@FIND
old text (exact)
@@REPLACE
new text
@@END
```
- Several `@@FIND ... @@END` blocks can follow one `@@FILE`.
- The old text must occur once in the file. If it occurs many times, write `@@FIND ALL`.
- Create a file: `@@WRITE libs/name.js` ... `@@END`. Delete a file: `@@DELETE libs/name.js`.

**2) Zip:** keep the files at their `assets` paths (for example `index.html`, `js/app/projected.js`). A whole-project zip also works; only files under `app/src/main/assets/` are used. A `patch.txt` inside the zip is applied too.

### Limits

- Only files under `app/src/main/assets/` can be updated. Changes to `MainActivity.java`, permissions or the icon need a new APK.
- Installing a new APK resets in-app updates to the original files, so save them first (Save updated files) and commit them to `app/src/main/assets/`.

## Notes

- This is a debug APK, fine for personal use. Publishing on the Play Store needs your own signing key.
- Reading data from screenshots is not part of this app.
- Original files are kept in the browser database (IndexedDB) with a small-file fallback; behaviour on very full storage has not been confirmed on every device.
