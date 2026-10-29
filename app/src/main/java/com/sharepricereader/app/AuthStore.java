package com.sharepricereader.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.util.Locale;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Authenticator (TOTP, RFC 6238) for the "Authentication" page.
 * - Secrets are kept in SharedPreferences, encrypted with an AES-256-GCM key that lives in the
 *   Android Keystore (the key cannot be read out of the phone).
 * - The WebView / JavaScript NEVER receives a secret: it only gets the issuer, the account name and the
 *   current code. So secrets are not in localStorage, not in the Gmail backup, not in any export.
 * - Not included in Android cloud backup (allowBackup=false).
 */
final class AuthStore {
    private static final String PREF = "ds_auth_store";
    private static final String KEY_DATA = "data";
    private static final String ALIAS = "ds_auth_key_v1";
    private static final int MAX_ACCOUNTS = 100;
    private static final String B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    private final Context ctx;
    private JSONArray cache; // decrypted list, kept only in memory of this process
    private boolean unlocked = false; // true after PIN / pattern / fingerprint this session

    AuthStore(Context c) {
        this.ctx = c.getApplicationContext();
    }

    /* ---------------- encryption ---------------- */

    private SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (!ks.containsAlias(ALIAS)) {
            KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            kg.init(new KeyGenParameterSpec.Builder(ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .build());
            return kg.generateKey();
        }
        return (SecretKey) ks.getKey(ALIAS, null);
    }

    private String encrypt(byte[] plain) throws Exception {
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, key());
        byte[] iv = c.getIV();
        byte[] ct = c.doFinal(plain);
        byte[] out = new byte[iv.length + ct.length];
        System.arraycopy(iv, 0, out, 0, iv.length);
        System.arraycopy(ct, 0, out, iv.length, ct.length);
        return Base64.encodeToString(out, Base64.NO_WRAP);
    }

    private byte[] decrypt(String b64) throws Exception {
        byte[] in = Base64.decode(b64, Base64.NO_WRAP);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, in, 0, 12));
        return c.doFinal(in, 12, in.length - 12);
    }

    private JSONArray load() throws Exception {
        if (cache != null) return cache;
        SharedPreferences sp = ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE);
        String s = sp.getString(KEY_DATA, null);
        if (s == null) {
            cache = new JSONArray();
        } else {
            cache = new JSONArray(new String(decrypt(s), "UTF-8"));
        }
        return cache;
    }

    private void save(JSONArray a) throws Exception {
        String enc = encrypt(a.toString().getBytes("UTF-8"));
        ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit().putString(KEY_DATA, enc).apply();
        cache = a;
    }

    /* ---------------- base32 + TOTP ---------------- */

    private static byte[] base32(String in) {
        String s = in.toUpperCase(Locale.US).replaceAll("[\\s\\-=]", "");
        if (s.length() < 8) throw new IllegalArgumentException("Setup key is too short");
        ByteBuffer out = ByteBuffer.allocate(s.length() * 5 / 8 + 1);
        int buf = 0, bits = 0;
        for (int i = 0; i < s.length(); i++) {
            int v = B32.indexOf(s.charAt(i));
            if (v < 0) throw new IllegalArgumentException("Setup key has invalid characters (use A-Z and 2-7)");
            buf = (buf << 5) | v;
            bits += 5;
            if (bits >= 8) {
                out.put((byte) ((buf >> (bits - 8)) & 0xff));
                bits -= 8;
            }
        }
        byte[] r = new byte[out.position()];
        out.rewind();
        out.get(r);
        return r;
    }

    private static String code(JSONObject a, long nowSec) throws Exception {
        String algo = a.optString("algo", "SHA1");
        int digits = a.optInt("digits", 6);
        int period = a.optInt("period", 30);
        byte[] k = base32(a.getString("secret"));
        Mac m = Mac.getInstance("Hmac" + algo);
        m.init(new SecretKeySpec(k, "Hmac" + algo));
        byte[] h = m.doFinal(ByteBuffer.allocate(8).putLong(nowSec / period).array());
        int o = h[h.length - 1] & 0x0f;
        int bin = ((h[o] & 0x7f) << 24) | ((h[o + 1] & 0xff) << 16) | ((h[o + 2] & 0xff) << 8) | (h[o + 3] & 0xff);
        long mod = 1;
        for (int i = 0; i < digits; i++) mod *= 10;
        String s = Long.toString(bin % mod);
        while (s.length() < digits) s = "0" + s;
        return s;
    }

    /* ---------------- optional lock (phone PIN / pattern / fingerprint) ---------------- */

    synchronized boolean lockEnabled() {
        return ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).getBoolean("lock", false);
    }

    synchronized void setLockEnabled(boolean on) {
        ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit().putBoolean("lock", on).apply();
        unlocked = on; // turning it on just proved the credential; turning it off needs none
    }

    synchronized void setUnlocked(boolean u) {
        unlocked = u;
        if (!u) cache = null; // forget the decrypted list when locking
    }

    synchronized boolean isLocked() {
        return lockEnabled() && !unlocked;
    }

    private static String lockedJson() {
        return "{\"ok\":false,\"locked\":true,\"error\":\"Locked\"}";
    }

    /* ---------------- API used by the bridge (all return JSON text) ---------------- */

    private static String fail(String msg) {
        try {
            return new JSONObject().put("ok", false).put("error", msg == null ? "error" : msg).toString();
        } catch (Exception e) {
            return "{\"ok\":false}";
        }
    }

    private static String okJson() {
        return "{\"ok\":true}";
    }

    /** {"ok":true,"items":[{id,issuer,name,digits,period,code,remain}]} - no secrets */
    synchronized String list() {
        if (isLocked()) return lockedJson();
        try {
            JSONArray a = load();
            long now = System.currentTimeMillis() / 1000L;
            JSONArray items = new JSONArray();
            for (int i = 0; i < a.length(); i++) {
                JSONObject x = a.getJSONObject(i);
                int period = x.optInt("period", 30);
                JSONObject o = new JSONObject();
                o.put("id", x.getString("id"));
                o.put("issuer", x.optString("issuer", ""));
                o.put("name", x.optString("name", ""));
                o.put("digits", x.optInt("digits", 6));
                o.put("period", period);
                o.put("code", code(x, now));
                o.put("remain", period - (int) (now % period));
                items.put(o);
            }
            return new JSONObject().put("ok", true).put("items", items).toString();
        } catch (Exception e) {
            return fail("Cannot read saved accounts: " + e.getMessage());
        }
    }

    private String addAccount(String issuer, String name, String secret, String algo, int digits, int period) {
        try {
            issuer = issuer == null ? "" : issuer.trim();
            name = name == null ? "" : name.trim();
            if (issuer.length() > 60) issuer = issuer.substring(0, 60);
            if (name.length() > 80) name = name.substring(0, 80);
            if (issuer.isEmpty() && name.isEmpty()) return fail("Enter a service or account name");
            algo = algo == null ? "SHA1" : algo.toUpperCase(Locale.US).replace("-", "");
            if (!(algo.equals("SHA1") || algo.equals("SHA256") || algo.equals("SHA512"))) {
                return fail("Unsupported algorithm: " + algo);
            }
            if (digits < 6 || digits > 8) return fail("Unsupported code length");
            if (period < 10 || period > 120) return fail("Unsupported time step");
            String clean = secret == null ? "" : secret.toUpperCase(Locale.US).replaceAll("[\\s\\-=]", "");
            base32(clean); // validates
            JSONArray a = load();
            if (a.length() >= MAX_ACCOUNTS) return fail("Too many accounts");
            for (int i = 0; i < a.length(); i++) {
                if (clean.equals(a.getJSONObject(i).optString("secret"))) return fail("This account is already added");
            }
            byte[] rid = new byte[8];
            new SecureRandom().nextBytes(rid);
            JSONObject o = new JSONObject();
            o.put("id", Base64.encodeToString(rid, Base64.NO_WRAP | Base64.URL_SAFE | Base64.NO_PADDING));
            o.put("issuer", issuer);
            o.put("name", name);
            o.put("secret", clean);
            o.put("algo", algo);
            o.put("digits", digits);
            o.put("period", period);
            code(o, System.currentTimeMillis() / 1000L); // proves the secret works
            a.put(o);
            save(a);
            return okJson();
        } catch (IllegalArgumentException e) {
            return fail(e.getMessage());
        } catch (Exception e) {
            return fail("Could not save: " + e.getMessage());
        }
    }

    /** otpauth://totp/Issuer:account?secret=...&issuer=...&algorithm=SHA1&digits=6&period=30 */
    synchronized String addUri(String uri) {
        if (isLocked()) return lockedJson();
        try {
            if (uri == null || uri.length() > 2048) return fail("Not a valid QR code");
            Uri u = Uri.parse(uri.trim());
            if (!"otpauth".equalsIgnoreCase(u.getScheme())) return fail("This is not a 2-step verification QR code");
            if (!"totp".equalsIgnoreCase(u.getHost())) return fail("Only time-based (TOTP) codes are supported");
            String label = u.getPath() == null ? "" : u.getPath();
            if (label.startsWith("/")) label = label.substring(1);
            String issuer = u.getQueryParameter("issuer");
            String name = label;
            int c = label.indexOf(':');
            if (c >= 0) {
                if (issuer == null || issuer.isEmpty()) issuer = label.substring(0, c);
                name = label.substring(c + 1);
            }
            String secret = u.getQueryParameter("secret");
            if (secret == null || secret.isEmpty()) return fail("QR code has no secret");
            int digits = parseInt(u.getQueryParameter("digits"), 6);
            int period = parseInt(u.getQueryParameter("period"), 30);
            return addAccount(issuer, name, secret, u.getQueryParameter("algorithm"), digits, period);
        } catch (Exception e) {
            return fail("Not a valid QR code");
        }
    }

    synchronized String addManual(String issuer, String name, String secret) {
        if (isLocked()) return lockedJson();
        return addAccount(issuer, name, secret, "SHA1", 6, 30);
    }

    synchronized String rename(String id, String issuer, String name) {
        if (isLocked()) return lockedJson();
        try {
            JSONArray a = load();
            for (int i = 0; i < a.length(); i++) {
                JSONObject x = a.getJSONObject(i);
                if (x.getString("id").equals(id)) {
                    String is = issuer == null ? "" : issuer.trim();
                    String nm = name == null ? "" : name.trim();
                    if (is.isEmpty() && nm.isEmpty()) return fail("Enter a name");
                    x.put("issuer", is.length() > 60 ? is.substring(0, 60) : is);
                    x.put("name", nm.length() > 80 ? nm.substring(0, 80) : nm);
                    save(a);
                    return okJson();
                }
            }
            return fail("Account not found");
        } catch (Exception e) {
            return fail(e.getMessage());
        }
    }

    synchronized String delete(String id) {
        if (isLocked()) return lockedJson();
        try {
            JSONArray a = load();
            JSONArray n = new JSONArray();
            boolean found = false;
            for (int i = 0; i < a.length(); i++) {
                JSONObject x = a.getJSONObject(i);
                if (x.getString("id").equals(id)) {
                    found = true;
                } else {
                    n.put(x);
                }
            }
            if (!found) return fail("Account not found");
            save(n);
            return okJson();
        } catch (Exception e) {
            return fail(e.getMessage());
        }
    }

    private static int parseInt(String s, int def) {
        try {
            return s == null || s.isEmpty() ? def : Integer.parseInt(s.trim());
        } catch (Exception e) {
            return def;
        }
    }
}
