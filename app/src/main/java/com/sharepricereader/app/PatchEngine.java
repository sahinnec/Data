package com.sharepricereader.app;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * আপডেট ফাইল (zip বা patch লেখা) একটা ফোল্ডারে প্রয়োগ করে।
 * Android-এর কোনো class এখানে নেই, তাই আলাদাভাবে টেস্ট করা যায়।
 *
 * Patch লেখার নিয়ম (README দেখুন):
 *   #SRUPDATE
 *   @@VERSION নাম (ঐচ্ছিক)
 *   @@FILE index.html
 *   @@FIND            (বা @@FIND ALL)
 *   পুরনো লেখা
 *   @@REPLACE
 *   নতুন লেখা
 *   @@END
 *   @@WRITE path/new.js   ... পুরো ফাইলের লেখা ...   @@END
 *   @@DELETE path/old.js
 */
final class PatchEngine {

    /** মূল asset থেকে ফাইল পড়ার জন্য। ফাইল না থাকলে null দেবে। */
    interface Base {
        InputStream open(String path) throws IOException;
    }

    static final class Result {
        int edits, written, deleted, skipped;
        String label;

        String summary() {
            StringBuilder b = new StringBuilder();
            if (edits > 0) b.append("• Edited: ").append(edits).append('\n');
            if (written > 0) b.append("• Written: ").append(written).append('\n');
            if (deleted > 0) b.append("• Deleted: ").append(deleted).append('\n');
            if (skipped > 0) b.append("• Skipped: ").append(skipped).append('\n');
            if (b.length() == 0) b.append("• No changes\n");
            return b.toString().trim();
        }
    }

    private static final String ASSET_MARK = "app/src/main/assets/";
    private static final String[] SKIP_TOP = {
            "app", "gradle", ".github", "build.gradle", "settings.gradle", "gradlew",
            "gradle.properties", "readme.md", ".gitignore"
    };

    private final File root;
    private final Base base;
    private final Result r = new Result();

    private PatchEngine(File root, Base base) {
        this.root = root;
        this.base = base;
    }

    static Result apply(File root, Base base, byte[] data) throws Exception {
        PatchEngine e = new PatchEngine(root, base);
        if (data.length > 3 && data[0] == 'P' && data[1] == 'K') {
            e.zip(data);
        } else {
            e.text(new String(data, StandardCharsets.UTF_8));
        }
        return e.r;
    }

    // ---------------------------------------------------------------- zip

    private void zip(byte[] data) throws Exception {
        String patchText = null;
        try (ZipInputStream z = new ZipInputStream(new ByteArrayInputStream(data))) {
            ZipEntry en;
            while ((en = z.getNextEntry()) != null) {
                if (en.isDirectory()) continue;
                String name = en.getName().replace('\\', '/');
                if (name.startsWith("__MACOSX") || name.endsWith(".DS_Store")) continue;
                byte[] b = readAll(z);

                String base = name.substring(name.lastIndexOf('/') + 1).toLowerCase(Locale.ROOT);
                if (base.equals("patch.txt") || base.equals("update.txt")) {
                    patchText = new String(b, StandardCharsets.UTF_8);
                    continue;
                }
                if (!name.contains(ASSET_MARK)) {
                    String first = name.contains("/") ? name.substring(0, name.indexOf('/')) : name;
                    boolean skip = false;
                    for (String s : SKIP_TOP) {
                        if (first.equalsIgnoreCase(s)) { skip = true; break; }
                    }
                    if (skip) { r.skipped++; continue; }
                }
                write(rel(name), b);
                r.written++;
            }
        }
        if (patchText != null) text(patchText);
    }

    // ---------------------------------------------------------------- text patch

    private void text(String src) throws Exception {
        String[] L = src.replace("\uFEFF", "").replace("\r\n", "\n").replace('\r', '\n').split("\n", -1);
        int i = 0;
        while (i < L.length && L[i].trim().isEmpty()) i++;
        if (i >= L.length || !L[i].trim().startsWith("#SRUPDATE")) {
            throw new IllegalArgumentException(
                    "Not an update file. First line must be #SRUPDATE.");
        }
        i++;

        String cur = null;
        int editNo = 0;
        while (i < L.length) {
            String t = L[i].trim();
            if (t.isEmpty() || t.startsWith("#")) { i++; continue; }

            if (t.startsWith("@@VERSION")) {
                r.label = t.substring(9).trim();
                i++;
            } else if (t.startsWith("@@FILE ")) {
                cur = t.substring(7).trim();
                i++;
            } else if (t.startsWith("@@DELETE ")) {
                File f = resolve(t.substring(9));
                if (f.exists()) f.delete();
                // মূল asset মোছা যায় না; খালি ফাইল বসিয়ে দিই যাতে মূলটা আর না দেখা যায়
                else if (base.open(rel(t.substring(9))) != null) write(rel(t.substring(9)), new byte[0]);
                r.deleted++;
                i++;
            } else if (t.startsWith("@@WRITE ")) {
                String path = t.substring(8).trim();
                StringBuilder body = new StringBuilder();
                i = block(L, i + 1, "@@END", body, "@@WRITE " + path);
                write(rel(path), body.toString().getBytes(StandardCharsets.UTF_8));
                r.written++;
            } else if (t.equals("@@FIND") || t.equals("@@FIND ALL")) {
                editNo++;
                boolean all = t.equals("@@FIND ALL");
                if (cur == null) throw new IllegalArgumentException(
                        "Edit #" + editNo + ": add @@FILE name first.");
                StringBuilder find = new StringBuilder();
                StringBuilder rep = new StringBuilder();
                i = block(L, i + 1, "@@REPLACE", find, "Edit #" + editNo);
                i = block(L, i, "@@END", rep, "Edit #" + editNo);
                edit(cur, find.toString(), rep.toString(), all, editNo);
                r.edits++;
            } else {
                throw new IllegalArgumentException("Line " + (i + 1) + " not understood: " + shorten(t));
            }
        }
    }

    /** stop লাইন পর্যন্ত পড়ে out-এ জমায়; stop-এর পরের লাইনের index ফেরত দেয়। */
    private static int block(String[] L, int i, String stop, StringBuilder out, String where) {
        boolean first = true;
        while (i < L.length) {
            if (L[i].trim().equals(stop)) return i + 1;
            if (!first) out.append('\n');
            out.append(L[i]);
            first = false;
            i++;
        }
        throw new IllegalArgumentException(where + ": " + stop + " not found.");
    }

    private void edit(String path, String find, String rep, boolean all, int no) throws IOException {
        if (find.isEmpty()) throw new IllegalArgumentException("Edit #" + no + ": empty @@FIND.");
        File f = resolve(path);
        if (!f.exists()) {
            InputStream in = base.open(rel(path));
            if (in == null) throw new IOException("Edit #" + no + ": file '" + path + "' not found.");
            try { write(rel(path), readAll(in)); } finally { in.close(); }
        }
        String content = new String(readAll(new FileInputStream(f)), StandardCharsets.UTF_8);
        if (content.contains("\r\n")) {
            find = find.replace("\n", "\r\n");
            rep = rep.replace("\n", "\r\n");
        }
        int count = 0, at = 0;
        while ((at = content.indexOf(find, at)) >= 0) { count++; at += find.length(); }
        if (count == 0) {
            throw new IllegalArgumentException("Edit #" + no + ": text not found in '" + path
                    + "' (must match exactly):\n" + shorten(find));
        }
        if (count > 1 && !all) {
            throw new IllegalArgumentException("Edit #" + no + ": text found " + count
                    + " times. Add more lines to make it unique, or use @@FIND ALL:\n"
                    + shorten(find));
        }
        write(rel(path), content.replace(find, rep).getBytes(StandardCharsets.UTF_8));
    }

    // ---------------------------------------------------------------- helpers

    /** পাথ পরিষ্কার করে; app/src/main/assets/ থাকলে তার আগের অংশ ফেলে দেয়। */
    static String rel(String p) {
        p = p.trim().replace('\\', '/');
        int a = p.indexOf(ASSET_MARK);
        if (a >= 0) p = p.substring(a + ASSET_MARK.length());
        while (p.startsWith("/")) p = p.substring(1);
        return p;
    }

    private File resolve(String p) throws IOException {
        String rp = rel(p);
        if (rp.isEmpty() || rp.endsWith("/")) throw new IOException("Bad file name: " + p);
        File f = new File(root, rp);
        String rc = root.getCanonicalPath() + File.separator;
        if (!f.getCanonicalPath().startsWith(rc)) throw new IOException("Bad path: " + p);
        return f;
    }

    private void write(String path, byte[] data) throws IOException {
        File f = resolve(path);
        File parent = f.getParentFile();
        if (parent != null) parent.mkdirs();
        try (FileOutputStream out = new FileOutputStream(f)) {
            out.write(data);
        }
    }

    private static String shorten(String s) {
        s = s.replace("\n", "⏎");
        return s.length() > 90 ? s.substring(0, 90) + "…" : s;
    }

    static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        return out.toByteArray();
    }

    static void copyDir(File src, File dst) throws IOException {
        if (src.isDirectory()) {
            dst.mkdirs();
            File[] kids = src.listFiles();
            if (kids != null) for (File k : kids) copyDir(k, new File(dst, k.getName()));
        } else {
            try (InputStream in = new FileInputStream(src); FileOutputStream out = new FileOutputStream(dst)) {
                byte[] buf = new byte[16384];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
        }
    }

    static void deleteDir(File f) {
        if (f == null || !f.exists()) return;
        if (f.isDirectory()) {
            File[] kids = f.listFiles();
            if (kids != null) for (File k : kids) deleteDir(k);
        }
        f.delete();
    }
}
