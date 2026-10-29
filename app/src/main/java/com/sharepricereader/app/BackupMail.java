package com.sharepricereader.app;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.Properties;

import javax.activation.DataHandler;
import javax.mail.Flags;
import javax.mail.Folder;
import javax.mail.Message;
import javax.mail.Multipart;
import javax.mail.Part;
import javax.mail.Session;
import javax.mail.Store;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import javax.mail.util.ByteArrayDataSource;

/**
 * Cloud backup storage inside the user's own Gmail (IMAP; Google sign-in token or App password).
 * Every backup is one mail with the backup file attached, stored under the Gmail label "DataShow-Backup".
 * Like Google Drive auto backup: only the newest KEEP files are kept, older ones are moved to Trash.
 * Runs on a worker thread. Needs only the INTERNET permission.
 */
final class BackupMail {
    static final String LABEL = "DataShow-Backup";
    static final String HDR = "X-DataShow-Backup";
    static final int KEEP = 15;
    static final int MAX_BYTES = 22 * 1024 * 1024;

    private BackupMail() {
    }

    private static Store open(String user, String pass, boolean oauth) throws Exception {
        Properties p = new Properties();
        p.put("mail.store.protocol", "imaps");
        p.put("mail.imaps.host", "imap.gmail.com");
        p.put("mail.imaps.port", "993");
        p.put("mail.imaps.ssl.enable", "true");
        p.put("mail.imaps.connectiontimeout", "15000");
        p.put("mail.imaps.timeout", "60000");
        p.put("mail.imaps.writetimeout", "120000");
        if (oauth) {
            // Google sign-in: "pass" is the OAuth access token (JavaMail has built-in XOAUTH2)
            p.put("mail.imaps.auth.mechanisms", "XOAUTH2");
            p.put("mail.imaps.auth.xoauth2.disable", "false");
        }
        Store st = Session.getInstance(p).getStore("imaps");
        st.connect("imap.gmail.com", user, pass);
        return st;
    }

    private static Folder findTrash(Store store) {
        try {
            for (Folder f : store.getDefaultFolder().list("*")) {
                if (f instanceof com.sun.mail.imap.IMAPFolder) {
                    for (String a : ((com.sun.mail.imap.IMAPFolder) f).getAttributes()) {
                        if ("\\Trash".equalsIgnoreCase(a)) {
                            return f;
                        }
                    }
                }
            }
            String[] names = {"[Gmail]/Trash", "[Gmail]/Bin", "[Google Mail]/Trash", "[Google Mail]/Bin"};
            for (String n : names) {
                Folder f = store.getFolder(n);
                if (f.exists()) {
                    return f;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static Date when(Message m) {
        try {
            Date d = m.getSentDate();
            if (d == null) d = m.getReceivedDate();
            return d == null ? new Date(0) : d;
        } catch (Exception e) {
            return new Date(0);
        }
    }

    /** Appends one backup mail, then trims to the newest KEEP. Returns {"ok":1,"kept":n}. */
    static String put(String user, String pass, boolean oauth, String name, byte[] data) throws Exception {
        if (data.length > MAX_BYTES) {
            throw new Exception("Backup is too big for mail (" + (data.length / 1024 / 1024) + " MB)");
        }
        String safe = name.replaceAll("[^A-Za-z0-9._ -]", "_");
        Store store = open(user, pass, oauth);
        try {
            Folder f = store.getFolder(LABEL);
            if (!f.exists()) {
                f.create(Folder.HOLDS_MESSAGES);
            }
            f.open(Folder.READ_WRITE);
            try {
                MimeMessage msg = new MimeMessage(Session.getInstance(new Properties()));
                msg.setFrom(new InternetAddress(user));
                msg.setRecipients(Message.RecipientType.TO, InternetAddress.parse(user));
                msg.setSubject("Data Show backup " + safe, "UTF-8");
                msg.setSentDate(new Date());
                msg.setHeader(HDR, safe);

                MimeBodyPart text = new MimeBodyPart();
                text.setText("Data Show app backup. Do not delete: open Backup > Restore in the app to use it.", "UTF-8");
                MimeBodyPart att = new MimeBodyPart();
                att.setDataHandler(new DataHandler(new ByteArrayDataSource(data, "application/octet-stream")));
                att.setFileName(safe);
                att.setDisposition(Part.ATTACHMENT);
                MimeMultipart mp = new MimeMultipart();
                mp.addBodyPart(text);
                mp.addBodyPart(att);
                msg.setContent(mp);
                msg.saveChanges();
                f.appendMessages(new Message[]{msg});

                // keep only the newest KEEP backups
                Message[] all = f.getMessages();
                int kept = all.length;
                if (all.length > KEEP) {
                    Message[] sorted = Arrays.copyOf(all, all.length);
                    Arrays.sort(sorted, new Comparator<Message>() {
                        @Override
                        public int compare(Message a, Message b) {
                            return when(a).compareTo(when(b));
                        }
                    });
                    int drop = sorted.length - KEEP;
                    Message[] old = Arrays.copyOfRange(sorted, 0, drop);
                    Folder trash = findTrash(store);
                    if (trash != null) {
                        f.copyMessages(old, trash);
                    }
                    f.setFlags(old, new Flags(Flags.Flag.DELETED), true);
                    f.expunge();
                    kept = KEEP;
                }
                JSONObject r = new JSONObject();
                r.put("ok", 1);
                r.put("kept", kept);
                return r.toString();
            } finally {
                f.close(false);
            }
        } finally {
            store.close();
        }
    }

    /** Returns [{"uid","name","date","size"}] newest first (empty array when there is no backup yet). */
    static String list(String user, String pass, boolean oauth) throws Exception {
        Store store = open(user, pass, oauth);
        try {
            Folder f = store.getFolder(LABEL);
            JSONArray out = new JSONArray();
            if (!f.exists()) {
                return out.toString();
            }
            f.open(Folder.READ_ONLY);
            try {
                com.sun.mail.imap.IMAPFolder imf = (com.sun.mail.imap.IMAPFolder) f;
                ArrayList<Message> msgs = new ArrayList<Message>(Arrays.asList(f.getMessages()));
                Collections.sort(msgs, new Comparator<Message>() {
                    @Override
                    public int compare(Message a, Message b) {
                        return when(b).compareTo(when(a));
                    }
                });
                for (Message m : msgs) {
                    String[] h = m.getHeader(HDR);
                    String nm = (h != null && h.length > 0) ? h[0] : (m.getSubject() == null ? "backup" : m.getSubject());
                    JSONObject o = new JSONObject();
                    o.put("uid", imf.getUID(m));
                    o.put("name", nm);
                    o.put("date", when(m).getTime());
                    o.put("size", m.getSize());
                    out.put(o);
                }
            } finally {
                f.close(false);
            }
            return out.toString();
        } finally {
            store.close();
        }
    }

    private static Part findAttachment(Part p) throws Exception {
        if (p.isMimeType("multipart/*")) {
            Multipart mp = (Multipart) p.getContent();
            for (int i = 0; i < mp.getCount(); i++) {
                Part r = findAttachment(mp.getBodyPart(i));
                if (r != null) return r;
            }
            return null;
        }
        return p.getFileName() != null ? p : null;
    }

    /** Returns the raw bytes of the backup file attached to the mail with this UID. */
    static byte[] get(String user, String pass, boolean oauth, long uid) throws Exception {
        Store store = open(user, pass, oauth);
        try {
            Folder f = store.getFolder(LABEL);
            if (!f.exists()) {
                throw new Exception("No backup found in Gmail");
            }
            f.open(Folder.READ_ONLY);
            try {
                Message m = ((com.sun.mail.imap.IMAPFolder) f).getMessageByUID(uid);
                if (m == null) {
                    throw new Exception("That backup is no longer in Gmail");
                }
                Part att = findAttachment(m);
                if (att == null) {
                    throw new Exception("Backup file not found inside the mail");
                }
                ByteArrayOutputStream bo = new ByteArrayOutputStream();
                InputStream in = att.getInputStream();
                try {
                    byte[] buf = new byte[16384];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        bo.write(buf, 0, n);
                    }
                } finally {
                    in.close();
                }
                return bo.toByteArray();
            } finally {
                f.close(false);
            }
        } finally {
            store.close();
        }
    }
}
