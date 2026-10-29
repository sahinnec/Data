# Security hardening (Data Show)

Changes applied to reduce attack surface:

## Closed / reduced

| Issue | Fix |
|-------|-----|
| ADB / cloud backup of tokens & data | `allowBackup=false` + data extraction rules exclude all |
| Cleartext HTTP to arbitrary hosts | Default HTTPS only; HTTP only for dsebd.org / cse.com.bd |
| WebView file ↔ file XSS | `setAllowFileAccessFromFileURLs(false)`, universal access off |
| WebView content access | `setAllowContentAccess(false)` |
| Remote WebView debugging | Forced off |
| `openUri` / `openBrowser` / `fetchUrl` | Scheme whitelist (no `file://`, `javascript:`, etc.) |
| In-app browser `DSSelB.open()` | http(s) only + size limits on send/share/hist |
| Mixed content in main WebView | `MIXED_CONTENT_NEVER_ALLOW` |

## Remaining residual risks (by design)

1. **JavascriptInterface on main WebView** — required for save/share/Gmail. Only loads local assets (+ in-app updates). A malicious *in-app update* could still call the bridge; only install updates you trust.
2. **Smart Selection bridge on external pages** — needed for table selection. Methods are size- and scheme-limited; a hostile site can still trigger send/share/open(https). Do not enter secrets on random sites in the in-app browser.
3. **Gmail App password in localStorage** — prefer **Sign in with Google** (OAuth). App password is optional fallback and stays on-device only.
4. **DSE certificate bypass** — only for `dsebd.org` public price pages (known bad cert chain on some devices). Not used for Gmail or Google.

## Recommendations for users

- Prefer Google Sign-In over App password.
- Do not install unknown update zips.
- For Play Store release: use your own release keystore and add its SHA-1 in Google Cloud Console.

## Backup & Restore (added)

- Backup file = all app data (localStorage + IndexedDB). The Gmail App password and PDF password are **not** written into it.
- Cloud copy goes to the user's own Gmail (label `DataShow-Backup`, newest 15 kept). With Google sign-in it uses OAuth (XOAUTH2), so no password is stored for it.
- Restore replaces all data and warns to use only your own backups: a backup file is trusted data, so never restore a file from someone else.
- Authenticator secrets are never part of a backup (see below).

## Authentication page / TOTP (added)

- "+" menu > Authentication: scan a website's 2-step verification QR code (`otpauth://totp/...`) or type the setup key.
- Secrets are stored in `AuthStore.java`, encrypted with an AES-256-GCM key inside the Android Keystore. JavaScript only receives issuer, account name and the current code, never the secret.
- Not in localStorage, not in the Gmail backup, not in Android cloud backup (`allowBackup=false`).
- The page sets `FLAG_SECURE` while open (no screenshots, hidden in recent apps).
- Not supported: HOTP (counter) codes and Google Authenticator "export" QR codes (`otpauth-migration://`).
- Residual: the bridge is also reachable by a malicious in-app update; it can read codes, not secrets.

## Final hardening pass (v3)

| Issue | Fix |
|-------|-----|
| Google sign-out kept the cached access token | Token is cleared **before** sign-out, on a worker thread |
| Access token pre-fetch ran on the UI thread (silently failed) | Moved to a worker thread |
| `gmailFetch` / `fetchUrl` callback id was put into JavaScript unchecked | Ids limited to letters/digits (same as backup) |
| DSE page download always skipped certificate checks | Normal check first; relaxed check only for `dsebd.org` and only if the normal check fails |
| In-app browser "Continue" on a bad certificate worked for login sites | Google, Claude and Grok hosts block the bypass completely |
| After "Continue" on any other bad-certificate site the page could call the app bridge | Bridge is switched off on every site except DSE/CSE after a certificate bypass (the bypass itself still works) |
| `GmailFetcher` used Java SASL for Google login (not available on Android) | Uses JavaMail's built-in XOAUTH2 |
| Authenticator had no lock | Optional lock with phone PIN / pattern / fingerprint, enforced in Java (JS cannot skip it); re-locks when the page closes or the app goes to background |
| `versionCode` stayed 1 | Now 3 |
| Duplicate CI runs | Older runs cancelled, 30-minute timeout |

Known limit: if the Android Keystore key for the Authenticator is lost (for example after a factory reset), saved accounts cannot be decrypted. Keep each service's recovery codes.
Not compiled here: no Android SDK in the build sandbox, so the first GitHub build is the real compile test.
