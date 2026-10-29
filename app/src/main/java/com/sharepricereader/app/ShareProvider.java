package com.sharepricereader.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.webkit.MimeTypeMap;

import java.io.File;
import java.io.FileNotFoundException;

/** Small file provider: share sheet files and camera photos live in cache/share. */
public class ShareProvider extends ContentProvider {
    public static final String AUTH = "com.sharepricereader.app.share";

    public static File dir(Context c) {
        File d = new File(c.getCacheDir(), "share");
        d.mkdirs();
        return d;
    }

    public static Uri uriFor(File f) {
        return new Uri.Builder().scheme("content").authority(AUTH).appendPath(f.getName()).build();
    }

    private File fileFor(Uri uri) throws FileNotFoundException {
        try {
            File base = dir(getContext());
            File f = new File(base, uri.getLastPathSegment());
            if (!f.getCanonicalPath().startsWith(base.getCanonicalPath() + File.separator))
                throw new FileNotFoundException("bad path");
            return f;
        } catch (java.io.IOException e) {
            throw new FileNotFoundException(e.getMessage());
        }
    }

    @Override public boolean onCreate() { return true; }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        return ParcelFileDescriptor.open(fileFor(uri), ParcelFileDescriptor.parseMode(mode));
    }

    @Override
    public Cursor query(Uri uri, String[] p, String s, String[] a, String o) {
        try {
            File f = fileFor(uri);
            MatrixCursor c = new MatrixCursor(new String[]{"_display_name", "_size"});
            c.addRow(new Object[]{f.getName(), f.length()});
            return c;
        } catch (FileNotFoundException e) {
            return null;
        }
    }

    @Override
    public String getType(Uri uri) {
        String n = String.valueOf(uri.getLastPathSegment());
        int i = n.lastIndexOf('.');
        String t = i >= 0 ? MimeTypeMap.getSingleton().getMimeTypeFromExtension(n.substring(i + 1).toLowerCase()) : null;
        return t != null ? t : "application/octet-stream";
    }

    @Override public Uri insert(Uri uri, ContentValues v) { return null; }
    @Override public int delete(Uri uri, String s, String[] a) { return 0; }
    @Override public int update(Uri uri, ContentValues v, String s, String[] a) { return 0; }
}
