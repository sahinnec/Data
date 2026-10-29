package com.sharepricereader.app;

import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Date;
import java.util.Properties;

import javax.mail.BodyPart;
import javax.mail.Folder;
import javax.mail.Message;
import javax.mail.Multipart;
import javax.mail.Session;
import javax.mail.Store;
import javax.mail.internet.MimeUtility;
import javax.mail.search.AndTerm;
import javax.mail.search.ComparisonTerm;
import javax.mail.search.FromStringTerm;
import javax.mail.search.ReceivedDateTerm;
import javax.mail.search.SearchTerm;

/**
 * Reads the newest PDF attachments from Gmail over IMAP (imap.gmail.com:993).
 * Supports:
 *   1) App password  → fetch(user, pass, from, days)
 *   2) Google OAuth  → fetchOAuth(user, accessToken, from, days)  (XOAUTH2)
 * Returns {"n":mailsChecked,"p":[{name,date,id,subject,b64}...]} newest first.
 */
final class GmailFetcher {
    private static final int MAX_PDFS = 12;
    private static final int MAX_BYTES = 2 * 1024 * 1024;     // one PDF
    private static final int MAX_TOTAL = 6 * 1024 * 1024;     // all PDFs together
    private static final int MAX_MAILS = 80;

    private GmailFetcher() {
    }

    /** App-password path (legacy). */
    static String fetch(String user, String pass, String from, int days) throws Exception {
        return fetchInternal(user, pass, false, from, days);
    }

    /** OAuth2 / XOAUTH2 path – pass the access token as the "password". */
    static String fetchOAuth(String user, String accessToken, String from, int days) throws Exception {
        return fetchInternal(user, accessToken, true, from, days);
    }

    private static String fetchInternal(String user, String secret, boolean oauth, String from, int days) throws Exception {
        Properties p = new Properties();
        p.put("mail.store.protocol", "imaps");
        p.put("mail.imaps.host", "imap.gmail.com");
        p.put("mail.imaps.port", "993");
        p.put("mail.imaps.ssl.enable", "true");
        p.put("mail.imaps.connectiontimeout", "15000");
        p.put("mail.imaps.timeout", "30000");
        if (oauth) {
            // Tell JavaMail to use XOAUTH2 instead of PLAIN/LOGIN
            p.put("mail.imaps.auth.mechanisms", "XOAUTH2");
            p.put("mail.imaps.auth.xoauth2.disable", "false");
        }
        Session session = Session.getInstance(p);
        Store store = session.getStore("imaps");
        store.connect("imap.gmail.com", user, secret);
        try {
            long since = System.currentTimeMillis() - (long) Math.max(1, days) * 24L * 3600L * 1000L;
            SearchTerm term = new ReceivedDateTerm(ComparisonTerm.GE, new Date(since));
            if (from != null && from.trim().length() > 0) {
                term = new AndTerm(new FromStringTerm(from.trim()), term);
            }
            JSONArray out = new JSONArray();
            java.util.HashSet<String> seenIds = new java.util.HashSet<String>();
            int[] stat = new int[]{0, 0}; // mails checked, bytes so far
            scan(store.getFolder("INBOX"), term, out, seenIds, stat);
            if (out.length() == 0) {
                Folder all = findAll(store);
                if (all != null) {
                    scan(all, term, out, seenIds, stat);
                }
            }
            JSONObject res = new JSONObject();
            res.put("n", stat[0]);
            res.put("p", out);
            return res.toString();
        } finally {
            store.close();
        }
    }

    private static Folder findAll(Store store) {
        try {
            for (Folder f : store.getDefaultFolder().list("*")) {
                if (f instanceof com.sun.mail.imap.IMAPFolder) {
                    String[] at = ((com.sun.mail.imap.IMAPFolder) f).getAttributes();
                    for (String a : at) {
                        if ("\\All".equalsIgnoreCase(a)) {
                            return f;
                        }
                    }
                }
            }
            Folder f = store.getFolder("[Gmail]/All Mail");
            if (f.exists()) {
                return f;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static void scan(Folder folder, SearchTerm term, JSONArray out,
                             java.util.HashSet<String> seenIds, int[] stat) throws Exception {
        folder.open(Folder.READ_ONLY);
        try {
            Message[] msgs = folder.search(term);
            stat[0] += msgs.length;
            int looked = 0;
            for (int i = msgs.length - 1; i >= 0 && out.length() < MAX_PDFS && looked < MAX_MAILS; i--, looked++) {
                Message m = msgs[i];
                if (!m.isMimeType("multipart/*")) {
                    continue;
                }
                String subject = m.getSubject() == null ? "" : m.getSubject();
                Date sent = m.getSentDate() != null ? m.getSentDate() : m.getReceivedDate();
                String id = "";
                String[] mid = m.getHeader("Message-ID");
                if (mid != null && mid.length > 0) {
                    id = mid[0];
                }
                if (id.length() > 0 && !seenIds.add(id)) {
                    continue;
                }
                collect((Multipart) m.getContent(), subject, sent, id, out, stat);
            }
        } finally {
            folder.close(false);
        }
    }

    private static void collect(Multipart mp, String subject, Date sent, String id, JSONArray out, int[] stat) throws Exception {
        for (int i = 0; i < mp.getCount() && out.length() < MAX_PDFS; i++) {
            BodyPart bp = mp.getBodyPart(i);
            if (bp.isMimeType("multipart/*")) {
                collect((Multipart) bp.getContent(), subject, sent, id, out, stat);
                continue;
            }
            String name = bp.getFileName();
            if (name != null) {
                try {
                    name = MimeUtility.decodeText(name);
                } catch (Exception ignore) {
                }
            }
            boolean pdf = bp.isMimeType("application/pdf")
                    || (name != null && name.toLowerCase().endsWith(".pdf"));
            if (!pdf) {
                continue;
            }
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            InputStream in = bp.getInputStream();
            try {
                byte[] buf = new byte[16384];
                int n;
                while ((n = in.read(buf)) > 0) {
                    bo.write(buf, 0, n);
                    if (bo.size() > MAX_BYTES) {
                        break;
                    }
                }
            } finally {
                in.close();
            }
            if (bo.size() > MAX_BYTES || bo.size() == 0 || stat[1] + bo.size() > MAX_TOTAL) {
                continue;
            }
            stat[1] += bo.size();
            JSONObject o = new JSONObject();
            o.put("name", name == null ? "mail.pdf" : name);
            o.put("date", sent == null ? 0L : sent.getTime());
            o.put("id", id);
            o.put("subject", subject);
            o.put("b64", Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP));
            out.put(o);
        }
    }
}
