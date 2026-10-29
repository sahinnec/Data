package com.sharepricereader.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceResponse;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * অ্যাপের ভেতরের আপডেট ব্যবস্থা।
 * বদলানো ফাইলগুলো filesDir/www-তে থাকে। WebView কোনো ফাইল চাইলে আগে এখানে খোঁজা হয়,
 * না পেলে মূল assets থেকে আসে। তাই URL আর localStorage (সেভ করা ডাটা) একই থাকে।
 */
final class Updater {

    private static final String ASSET_PREFIX = "file:///android_asset/";
    private static final String LABEL_FILE = ".label";

    private Updater() {}

    static File dir(Context c) { return new File(c.getFilesDir(), "www"); }
    private static File tmp(Context c) { return new File(c.getFilesDir(), "www_new"); }
    private static File bak(Context c) { return new File(c.getFilesDir(), "www_backup"); }

    private static PatchEngine.Base assets(final Context c) {
        return new PatchEngine.Base() {
            @Override
            public InputStream open(String path) {
                try {
                    return c.getAssets().open(path);
                } catch (IOException e) {
                    return null;
                }
            }
        };
    }

    /** নতুন APK install হলে আগের আপডেট মুছে ফেলা, যাতে নতুন APK-র ফাইল ঢাকা না পড়ে। */
    static void resetIfApkChanged(Context c) {
        try {
            long t = c.getPackageManager().getPackageInfo(c.getPackageName(), 0).lastUpdateTime;
            SharedPreferences p = c.getSharedPreferences("upd", Context.MODE_PRIVATE);
            if (p.getLong("apkTime", -1) != t) {
                reset(c);
                p.edit().putLong("apkTime", t).apply();
            }
        } catch (Exception ignored) {
        }
    }

    static boolean hasUpdate(Context c) { return dir(c).isDirectory(); }

    static String label(Context c) {
        File f = new File(dir(c), LABEL_FILE);
        if (!f.isFile()) return "Original";
        try (FileInputStream in = new FileInputStream(f)) {
            String s = new String(PatchEngine.readAll(in), StandardCharsets.UTF_8).trim();
            return s.isEmpty() ? "Updated" : s;
        } catch (IOException e) {
            return "Updated";
        }
    }

    /** আপডেট প্রয়োগ। ব্যর্থ হলে কিছুই বদলায় না। */
    static PatchEngine.Result apply(Context c, byte[] data) throws Exception {
        File www = dir(c), tmp = tmp(c), bak = bak(c);
        PatchEngine.deleteDir(tmp);
        if (www.exists()) PatchEngine.copyDir(www, tmp); else tmp.mkdirs();

        PatchEngine.Result r;
        try {
            r = PatchEngine.apply(tmp, assets(c), data);
            String label = r.label != null && !r.label.isEmpty() ? r.label : "Update";
            try (FileOutputStream out = new FileOutputStream(new File(tmp, LABEL_FILE))) {
                out.write(label.getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception e) {
            PatchEngine.deleteDir(tmp);
            throw e;
        }

        PatchEngine.deleteDir(bak);
        if (www.exists() && !www.renameTo(bak)) {
            PatchEngine.deleteDir(tmp);
            throw new IOException("Could not move old files");
        }
        if (!tmp.renameTo(www)) {
            if (bak.exists()) bak.renameTo(www);
            throw new IOException("Could not place new files");
        }
        return r;
    }

    /** এক ধাপ আগে ফেরা। আগের কিছু না থাকলে মূল অ্যাপে ফেরে। */
    static void undo(Context c) {
        File www = dir(c), bak = bak(c);
        PatchEngine.deleteDir(www);
        if (bak.exists()) bak.renameTo(www);
    }

    static void reset(Context c) {
        PatchEngine.deleteDir(dir(c));
        PatchEngine.deleteDir(bak(c));
        PatchEngine.deleteDir(tmp(c));
    }

    /** বদলানো ফাইলগুলো zip করে (GitHub-এ দেওয়ার জন্য)। কিছু না থাকলে null। */
    static byte[] exportZip(Context c) throws IOException {
        File www = dir(c);
        if (!www.isDirectory()) return null;
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        int[] n = {0};
        try (ZipOutputStream z = new ZipOutputStream(bo)) {
            addToZip(z, www, "", n);
        }
        return n[0] == 0 ? null : bo.toByteArray();
    }

    private static void addToZip(ZipOutputStream z, File f, String prefix, int[] n) throws IOException {
        File[] kids = f.listFiles();
        if (kids == null) return;
        for (File k : kids) {
            if (k.getName().startsWith(".")) continue;
            String name = prefix + k.getName();
            if (k.isDirectory()) {
                addToZip(z, k, name + "/", n);
            } else {
                z.putNextEntry(new ZipEntry("app/src/main/assets/" + name));
                try (FileInputStream in = new FileInputStream(k)) {
                    z.write(PatchEngine.readAll(in));
                }
                z.closeEntry();
                n[0]++;
            }
        }
    }

    /** WebView-র অনুরোধে: বদলানো ফাইল থাকলে সেটা দেয়, না থাকলে null (মানে মূল asset)। */
    static WebResourceResponse intercept(Context c, Uri uri) {
        try {
            String u = uri.toString();
            if (!u.startsWith(ASSET_PREFIX)) return null;
            File root = dir(c);
            if (!root.isDirectory()) return null;

            String p = u.substring(ASSET_PREFIX.length());
            int q = p.indexOf('?');
            if (q >= 0) p = p.substring(0, q);
            q = p.indexOf('#');
            if (q >= 0) p = p.substring(0, q);
            p = Uri.decode(p);
            if (p.isEmpty() || p.startsWith(".")) return null;

            File f = new File(root, p);
            if (!f.isFile()) return null;
            if (!f.getCanonicalPath().startsWith(root.getCanonicalPath() + File.separator)) return null;

            String ext = MimeTypeMap.getFileExtensionFromUrl(p).toLowerCase(Locale.ROOT);
            String mime = mimeOf(ext);
            boolean text = mime.startsWith("text/") || mime.equals("application/javascript")
                    || mime.equals("application/json") || mime.equals("image/svg+xml");
            return new WebResourceResponse(mime, text ? "UTF-8" : null, new FileInputStream(f));
        } catch (Exception e) {
            return null;
        }
    }

    private static String mimeOf(String ext) {
        switch (ext) {
            case "html": case "htm": return "text/html";
            case "js": case "mjs": return "application/javascript";
            case "css": return "text/css";
            case "json": return "application/json";
            case "svg": return "image/svg+xml";
            case "png": return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "gif": return "image/gif";
            case "webp": return "image/webp";
            case "woff2": return "font/woff2";
            case "woff": return "font/woff";
            case "ttf": return "font/ttf";
            case "txt": return "text/plain";
            default:
                String m = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
                return m != null ? m : "application/octet-stream";
        }
    }
}
