package com.sharepricereader.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.gms.auth.UserRecoverableAuthException;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.tasks.Task;

import org.json.JSONObject;

import java.io.IOException;

/**
 * Google Sign-In + Gmail OAuth helper.
 * Scopes: email + https://mail.google.com/ (full IMAP/SMTP access via XOAUTH2).
 * Tokens are cached in SharedPreferences. Access token is refreshed on demand.
 */
final class GoogleAuthHelper {

    private static final String TAG = "GoogleAuth";
    private static final String PREF = "ds_google_auth";
    private static final String KEY_EMAIL = "email";
    private static final String KEY_ID = "id";
    private static final String KEY_DISPLAY = "display";
    private static final String KEY_PHOTO = "photo";
    private static final String SCOPE_GMAIL = "oauth2:https://mail.google.com/";

    // Gmail full access (needed for IMAP XOAUTH2)
    private static final Scope SCOPE_MAIL = new Scope("https://mail.google.com/");

    private final Activity activity;
    private final GoogleSignInClient client;
    private Intent pendingRecoverable;

    GoogleAuthHelper(Activity activity) {
        this.activity = activity;
        // DEFAULT_SIGN_IN already requests email + profile + ID
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestScopes(SCOPE_MAIL)
                .build();
        this.client = GoogleSignIn.getClient(activity, gso);
    }

    Intent getSignInIntent() {
        return client.getSignInIntent();
    }

    /** Call from onActivityResult after REQ_GOOGLE_SIGN_IN */
    JSONObject handleSignInResult(Intent data) {
        try {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            GoogleSignInAccount account = task.getResult(ApiException.class);
            if (account == null || account.getEmail() == null) {
                return err("No account returned");
            }
            saveAccount(account);
            // Pre-fetch an access token so the first Gmail call is faster.
            // GoogleAuthUtil.getToken must NOT run on the UI thread, so use a worker thread.
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        getAccessToken(false);
                    } catch (Exception ignored) {
                    }
                }
            }).start();
            return statusJson(true);
        } catch (ApiException e) {
            Log.w(TAG, "Sign-in failed code=" + e.getStatusCode(), e);
            return err("Sign-in cancelled or failed (code " + e.getStatusCode() + ")");
        }
    }

    /** Must be called off the UI thread (it clears the cached token over the network). */
    void signOut() {
        // 1) drop the cached access token while the account is still known
        try {
            GoogleSignInAccount acc = GoogleSignIn.getLastSignedInAccount(activity);
            if (acc != null && acc.getAccount() != null) {
                GoogleAuthUtil.clearToken(activity, GoogleAuthUtil.getToken(activity, acc.getAccount(), SCOPE_GMAIL));
            }
        } catch (Exception ignored) {
        }
        // 2) then sign out and forget the saved profile
        client.signOut();
        SharedPreferences sp = activity.getSharedPreferences(PREF, Context.MODE_PRIVATE);
        sp.edit().clear().apply();
    }

    boolean isSignedIn() {
        GoogleSignInAccount acc = GoogleSignIn.getLastSignedInAccount(activity);
        return acc != null && acc.getEmail() != null;
    }

    String getEmail() {
        GoogleSignInAccount acc = GoogleSignIn.getLastSignedInAccount(activity);
        if (acc != null && acc.getEmail() != null) return acc.getEmail();
        return activity.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString(KEY_EMAIL, null);
    }

    /** Current status as JSON for JS: {ok, email, displayName, photoUrl} */
    JSONObject statusJson(boolean ok) {
        try {
            JSONObject o = new JSONObject();
            o.put("ok", ok && isSignedIn());
            String email = getEmail();
            if (email != null) o.put("email", email);
            SharedPreferences sp = activity.getSharedPreferences(PREF, Context.MODE_PRIVATE);
            String display = sp.getString(KEY_DISPLAY, null);
            String photo = sp.getString(KEY_PHOTO, null);
            if (display != null) o.put("displayName", display);
            if (photo != null) o.put("photoUrl", photo);
            return o;
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    /**
     * Returns a fresh access token for Gmail IMAP (XOAUTH2).
     * May throw UserRecoverableAuthException → caller should start the recovery intent.
     */
    String getAccessToken(boolean forceRefresh) throws Exception {
        GoogleSignInAccount acc = GoogleSignIn.getLastSignedInAccount(activity);
        if (acc == null || acc.getAccount() == null) {
            throw new IllegalStateException("Not signed in with Google");
        }
        if (forceRefresh) {
            try {
                String old = GoogleAuthUtil.getToken(activity, acc.getAccount(), SCOPE_GMAIL);
                GoogleAuthUtil.clearToken(activity, old);
            } catch (Exception ignored) {
            }
        }
        try {
            return GoogleAuthUtil.getToken(activity, acc.getAccount(), SCOPE_GMAIL);
        } catch (UserRecoverableAuthException e) {
            pendingRecoverable = e.getIntent();
            throw e;
        } catch (GoogleAuthException | IOException e) {
            throw e;
        }
    }

    Intent getPendingRecoverableIntent() {
        Intent i = pendingRecoverable;
        pendingRecoverable = null;
        return i;
    }

    private void saveAccount(GoogleSignInAccount account) {
        SharedPreferences.Editor ed = activity.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit();
        ed.putString(KEY_EMAIL, account.getEmail());
        ed.putString(KEY_ID, account.getId());
        if (account.getDisplayName() != null) ed.putString(KEY_DISPLAY, account.getDisplayName());
        if (account.getPhotoUrl() != null) ed.putString(KEY_PHOTO, account.getPhotoUrl().toString());
        ed.apply();
    }

    private static JSONObject err(String msg) {
        try {
            return new JSONObject().put("ok", false).put("error", msg == null ? "unknown" : msg);
        } catch (Exception e) {
            return new JSONObject();
        }
    }
}
