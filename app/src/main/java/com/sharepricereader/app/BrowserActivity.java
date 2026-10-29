package com.sharepricereader.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.TextView.OnEditorActionListener;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import android.content.SharedPreferences;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Full mobile browser for the website box: fast, JavaScript on, video (YouTube etc.) plays,
 * search/address bar on top. "Send" takes the selected text (or the whole page text) back to Data Show.
 */
public class BrowserActivity extends Activity {

    /** Result is passed through these fields (an Intent is too small for a whole page). */
    static String resText, resUrl;

    private WebView web;
    private EditText addr;
    private ProgressBar bar;
    private FrameLayout root;
    private View customView;
    private WebChromeClient.CustomViewCallback customCb;
    private LinearLayout page;
    private TextView selBtn;
    private TextView adBtn;

    // ---- ad block (network level) ----
    private boolean adOn = true;
    private static final String[] AD_HOSTS = {
            "doubleclick.net", "googlesyndication.com", "googleadservices.com", "googletagservices.com",
            "imasdk.googleapis.com", "pagead2.googlesyndication.com", "2mdn.net", "adservice.google.com",
            "admob.com", "adnxs.com", "adsrvr.org", "taboola.com", "outbrain.com", "popads.net", "popcash.net",
            "propellerads.com", "propellerclick.com", "adsterra.com", "exoclick.com", "exosrv.com", "juicyads.com",
            "mgid.com", "onetag-sys.com", "criteo.com", "criteo.net", "rubiconproject.com", "pubmatic.com",
            "openx.net", "smaato.net", "moatads.com", "adsafeprotected.com", "amazon-adsystem.com",
            "an.facebook.com", "applovin.com", "unityads.unity3d.com", "ironsrc.com", "supersonicads.com",
            "vungle.com", "adcolony.com", "inmobi.com", "mopub.com", "chartboost.com", "mintegral.com",
            "mintegral.net", "pangleglobal.com", "pangle.io", "bytedance-ads.com", "yandex.ru/ads", "adform.net",
            "advertising.com", "casalemedia.com", "contextweb.com", "lijit.com", "sharethrough.com",
            "teads.tv", "tremorhub.com", "spotxchange.com", "springserve.com", "smartadserver.com",
            "stickyadstv.com", "adition.com", "yieldmo.com", "revcontent.com", "zedo.com", "ad-delivery.net",
            "hotjar.com", "clarity.ms"
    };
    private static final String AD_CSS = "ins.adsbygoogle,[id^='google_ads'],[id*='ad-container'],[class*='ad-banner'],"
            + "iframe[src*='doubleclick'],iframe[src*='googlesyndication'],iframe[src*='/ads/'],[class*='adsbox']"
            + "{display:none!important}";

    private boolean isAdHost(String host) {
        if (host == null) return false;
        host = host.toLowerCase();
        for (String d : AD_HOSTS) {
            if (d.indexOf('/') >= 0) continue;
            if (host.equals(d) || host.endsWith("." + d)) return true;
        }
        return false;
    }

    private void styleAd() {
        adBtn.setText("\uD83D\uDEE1");
        adBtn.setAlpha(adOn ? 1f : 0.35f);
        adBtn.setBackgroundColor(adOn ? Color.parseColor("#c8f2d4") : Color.TRANSPARENT);
    }

    // ---- address-bar suggestions (history + Google suggest) ----
    private static class Sug {
        String text;
        boolean hist;
        Sug(String t, boolean h) {
            text = t;
            hist = h;
        }
    }

    private android.widget.ListView sugList;
    private android.widget.ArrayAdapter<Sug> sugAdapter;
    private final android.os.Handler ui = new android.os.Handler();
    private Runnable sugTask;
    private boolean suppressSug = false;
    private int sugSeq = 0;

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private TextView btn(String label, int size) {
        TextView t = new TextView(this);
        t.setText(label);
        t.setTextSize(size);
        t.setTextColor(Color.parseColor("#1b2333"));
        t.setGravity(Gravity.CENTER);
        t.setPadding(dp(12), dp(8), dp(12), dp(8));
        return t;
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        resText = null;
        resUrl = null;

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.WHITE);
        page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        root.addView(page, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets in) {
                v.setPadding(0, in.getSystemWindowInsetTop(), 0, in.getSystemWindowInsetBottom());
                return in;
            }
        });

        // ---- top bar: close, address/search, go
        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.HORIZONTAL);
        top.setGravity(Gravity.CENTER_VERTICAL);
        top.setBackgroundColor(Color.parseColor("#f4f6fb"));
        top.setPadding(dp(4), dp(4), dp(4), dp(4));

        TextView close = btn("\u2190", 22);
        close.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });
        top.addView(close);

        addr = new EditText(this);
        addr.setSingleLine(true);
        addr.setHint("Search or type link");
        addr.setTextSize(15);
        addr.setSelectAllOnFocus(true);
        addr.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        addr.setImeOptions(EditorInfo.IME_ACTION_GO);
        addr.setBackgroundColor(Color.WHITE);
        addr.setPadding(dp(10), dp(8), dp(10), dp(8));
        addr.setOnEditorActionListener(new OnEditorActionListener() {
            @Override
            public boolean onEditorAction(TextView v, int actionId, KeyEvent e) {
                if (actionId == EditorInfo.IME_ACTION_GO
                        || (e != null && e.getKeyCode() == KeyEvent.KEYCODE_ENTER)) {
                    go();
                    return true;
                }
                return false;
            }
        });
        top.addView(addr, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        TextView goB = btn("\uD83D\uDD0D", 20);
        goB.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                go();
            }
        });
        top.addView(goB);

        adOn = getSharedPreferences("dsbrowser", MODE_PRIVATE).getBoolean("adblock", true);
        adBtn = btn("\uD83D\uDEE1", 20);
        styleAd();
        adBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                adOn = !adOn;
                getSharedPreferences("dsbrowser", MODE_PRIVATE).edit().putBoolean("adblock", adOn).apply();
                styleAd();
                Toast.makeText(BrowserActivity.this, adOn ? "Ad block ON" : "Ad block OFF", Toast.LENGTH_SHORT).show();
                web.reload();
            }
        });
        top.addView(adBtn);
        page.addView(top, new LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT));

        bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100);
        bar.setVisibility(View.GONE);
        page.addView(bar, new LinearLayout.LayoutParams(-1, dp(3)));

        // ---- suggestions list (shown while typing in the address box)
        sugAdapter = new android.widget.ArrayAdapter<Sug>(this, 0, new java.util.ArrayList<Sug>()) {
            @Override
            public View getView(int pos, View cv, ViewGroup parent) {
                TextView t = cv instanceof TextView ? (TextView) cv : new TextView(BrowserActivity.this);
                Sug g = getItem(pos);
                t.setText((g.hist ? "\uD83D\uDD58  " : "\uD83D\uDD0D  ") + g.text);
                t.setTextSize(15);
                t.setTextColor(Color.parseColor("#1b2333"));
                t.setSingleLine(true);
                t.setEllipsize(android.text.TextUtils.TruncateAt.END);
                t.setPadding(dp(14), dp(11), dp(14), dp(11));
                return t;
            }
        };
        sugList = new android.widget.ListView(this);
        sugList.setAdapter(sugAdapter);
        sugList.setBackgroundColor(Color.WHITE);
        sugList.setVisibility(View.GONE);
        sugList.setOnItemClickListener(new android.widget.AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(android.widget.AdapterView<?> p, View v, int pos, long id) {
                Sug g = sugAdapter.getItem(pos);
                if (g == null) return;
                suppressSug = true;
                addr.setText(g.text);
                suppressSug = false;
                go();
            }
        });
        page.addView(sugList, new LinearLayout.LayoutParams(-1, 0, 1f));

        addr.addTextChangedListener(new android.text.TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence c, int a, int b2, int d) {
            }

            @Override
            public void onTextChanged(CharSequence c, int a, int b2, int d) {
            }

            @Override
            public void afterTextChanged(android.text.Editable e) {
                if (suppressSug || !addr.hasFocus()) return;
                scheduleSug(e.toString().trim());
            }
        });
        addr.setOnFocusChangeListener(new View.OnFocusChangeListener() {
            @Override
            public void onFocusChange(View v, boolean has) {
                if (!has) hideSug();
            }
        });

        // ---- web view
        web = new WebView(this);
        page.addView(web, new LinearLayout.LayoutParams(-1, 0, 1f));

        // ---- bottom bar: back, forward, reload, send
        LinearLayout bot = new LinearLayout(this);
        bot.setOrientation(LinearLayout.HORIZONTAL);
        bot.setGravity(Gravity.CENTER_VERTICAL);
        bot.setBackgroundColor(Color.parseColor("#f4f6fb"));
        bot.setPadding(dp(4), dp(2), dp(4), dp(2));

        TextView back = btn("\u25C0", 18);
        back.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (web.canGoBack()) web.goBack();
            }
        });
        TextView fwd = btn("\u25B6", 18);
        fwd.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (web.canGoForward()) web.goForward();
            }
        });
        TextView rel = btn("\u27F3", 20);
        rel.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                web.reload();
            }
        });
        // Select button lives here (bottom bar) so it never covers the page's own buttons / chat box
        selBtn = btn("Select", 14);
        styleSel(false);
        selBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                web.evaluateJavascript("(function(){if(window.DSSel&&window.DSSel.ready){DSSel.mode(!DSSel.isOn());return 1}return 0})()",
                        new ValueCallback<String>() {
                            @Override
                            public void onReceiveValue(String r) {
                                if (!"1".equals(r)) {
                                    injectSel();
                                    Toast.makeText(BrowserActivity.this, "Page loading... try again", Toast.LENGTH_SHORT).show();
                                }
                            }
                        });
            }
        });
        TextView send = btn("Send text \u27A4", 15);
        send.setTextColor(Color.WHITE);
        send.setBackgroundColor(Color.parseColor("#2563eb"));
        send.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                sendBack();
            }
        });
        bot.addView(back);
        bot.addView(fwd);
        bot.addView(rel);
        View sp = new View(this);
        bot.addView(sp, new LinearLayout.LayoutParams(0, 1, 1f));
        LinearLayout.LayoutParams slp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        slp.setMargins(0, 0, dp(8), 0);
        bot.addView(selBtn, slp);
        bot.addView(send);
        page.addView(bot, new LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT));

        setup();

        String u = getIntent().getStringExtra("url");
        if (u == null || u.trim().isEmpty()) u = "https://www.google.com/";
        addr.setText(u);
        web.loadUrl(u);
    }


    private void styleSel(boolean on) {
        selBtn.setText(on ? "Select: ON" : "Select");
        selBtn.setTextColor(Color.WHITE);
        selBtn.setBackgroundColor(Color.parseColor(on ? "#2563eb" : "#111827"));
    }

    /** Smart Selection bridge (called from libs/smartsel.js inside the website). */
    private String selJs;

    /**
     * Bridge used only by our injected smartsel.js.
     * Hardened: size limits, http(s)-only open, no file/content schemes.
     * Still exposed to the page (WebView limitation); keep surface minimal.
     */
    private class SelBridge {
        private static final int MAX_SEND = 2 * 1024 * 1024; // 2 MB
        private static final int MAX_SHARE = 100 * 1024;
        private static final int MAX_HIST = 6000;

        @android.webkit.JavascriptInterface
        public void send(final String t) {
            if (bridgeOff) return;
            if (t == null || t.trim().isEmpty() || t.length() > MAX_SEND) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    resText = t;
                    resUrl = web.getUrl();
                    setResult(RESULT_OK);
                    finish();
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void mode(final boolean on) {
            if (bridgeOff) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    styleSel(on);
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void share(final String t) {
            if (bridgeOff) return;
            if (t == null || t.length() > MAX_SHARE) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("text/plain");
                    i.putExtra(Intent.EXTRA_TEXT, t);
                    startActivity(Intent.createChooser(i, "Share"));
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void open(final String u) {
            if (bridgeOff) return;
            if (u == null) return;
            // Only allow safe schemes — block file://, content://, javascript:, intent:, etc.
            String low = u.trim().toLowerCase(java.util.Locale.US);
            if (!(low.startsWith("http://") || low.startsWith("https://"))) return;
            if (low.length() > 2048) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u.trim())));
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void addHist(String t) {
            if (bridgeOff) return;
            if (t == null) return;
            try {
                SharedPreferences sp = getSharedPreferences("dssel", MODE_PRIVATE);
                JSONArray old = new JSONArray(sp.getString("hist", "[]"));
                JSONArray a = new JSONArray();
                JSONObject o = new JSONObject();
                o.put("t", t.length() > MAX_HIST ? t.substring(0, MAX_HIST) : t);
                o.put("d", System.currentTimeMillis());
                a.put(o);
                for (int i = 0; i < old.length() && a.length() < 50; i++) a.put(old.get(i));
                sp.edit().putString("hist", a.toString()).apply();
            } catch (Exception ignored) {
            }
        }

        @android.webkit.JavascriptInterface
        public String hist() {
            if (bridgeOff) return "[]";
            return getSharedPreferences("dssel", MODE_PRIVATE).getString("hist", "[]");
        }
    }

    private String loadSelJs() {
        if (selJs != null) return selJs;
        try {
            InputStream in = getAssets().open("libs/smartsel.js");
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
            in.close();
            selJs = bo.toString("UTF-8");
        } catch (Exception e) {
            selJs = "";
        }
        return selJs;
    }

    private void injectSel() {
        if (bridgeOff) return;
        String js = loadSelJs();
        if (js.isEmpty()) return;
        web.evaluateJavascript(js + "\n;try{window.DSSel.init({hideFab:true,onMode:function(v){DSSelB.mode(!!v)},send:function(t){DSSelB.send(t)},share:function(t){DSSelB.share(t)},"
                + "openUrl:function(u){DSSelB.open(u)},save:function(t){},addHist:function(t){DSSelB.addHist(t)},"
                + "hist:function(){return DSSelB.hist()}})}catch(e){}", null);
    }

    // ---------- login / certificate / popup fixes (v43) ----------
    /** Hosts the user already accepted a certificate warning for (this browser session only). */
    private final java.util.HashSet<String> sslOk = new java.util.HashSet<String>();
    /** Hosts where the user pressed Continue on a certificate error and that are not DSE/CSE: no JS bridge there. */
    private final java.util.HashSet<String> untrustedSsl = new java.util.HashSet<String>();
    private volatile boolean bridgeOff = false;

    private static boolean trustedHost(String h) {
        String l = h == null ? "" : h.toLowerCase();
        return l.equals("dsebd.org") || l.endsWith(".dsebd.org")
                || l.equals("dse.com.bd") || l.endsWith(".dse.com.bd")
                || l.equals("cse.com.bd") || l.endsWith(".cse.com.bd");
    }
    private boolean sslAsking = false;
    private WebView popup;
    private FrameLayout popupBox;

    /** Same settings for the main page and for popup windows (Google / Claude / Grok login popups). */
    private void configure(WebView w) {
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        // login buttons ("Continue with Google") open a popup window: it must be allowed
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        // Harden: no local file / content access from remote pages
        s.setAllowFileAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setAllowContentAccess(false);
        if (android.os.Build.VERSION.SDK_INT >= 19) {
            WebView.setWebContentsDebuggingEnabled(false);
        }

        // Plain Chrome-like user agent: drop the "wv" and "Version/x.x" WebView markers
        // (Google refuses sign-in when it sees them: "This browser or app may not be secure").
        String ua = s.getUserAgentString();
        if (ua != null) {
            ua = ua.replace("; wv)", ")").replaceAll("\\sVersion/\\d+(\\.\\d+)*", "");
            s.setUserAgentString(ua);
        }

        // Stop sending the X-Requested-With: <app package> header (Google also uses it to detect apps).
        try {
            if (androidx.webkit.WebViewFeature.isFeatureSupported(
                    androidx.webkit.WebViewFeature.REQUESTED_WITH_HEADER_ALLOW_LIST)) {
                androidx.webkit.WebSettingsCompat.setRequestedWithHeaderOriginAllowList(
                        s, new java.util.HashSet<String>());
            }
        } catch (Throwable ignored) {
        }

        // Client-Hints (Sec-CH-UA) of a WebView say "Android WebView"; Google reads that too.
        // Report plain Chrome brands instead.
        try {
            if (androidx.webkit.WebViewFeature.isFeatureSupported(androidx.webkit.WebViewFeature.USER_AGENT_METADATA)) {
                String full = "130.0.0.0";
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("Chrome/(\\d+(?:\\.\\d+)*)").matcher(ua == null ? "" : ua);
                if (m.find()) full = m.group(1);
                String major = full.contains(".") ? full.substring(0, full.indexOf('.')) : full;
                java.util.List<androidx.webkit.UserAgentMetadata.BrandVersion> bl =
                        new java.util.ArrayList<androidx.webkit.UserAgentMetadata.BrandVersion>();
                bl.add(new androidx.webkit.UserAgentMetadata.BrandVersion.Builder()
                        .setBrand("Not?A_Brand").setMajorVersion("99").setFullVersion("99.0.0.0").build());
                bl.add(new androidx.webkit.UserAgentMetadata.BrandVersion.Builder()
                        .setBrand("Chromium").setMajorVersion(major).setFullVersion(full).build());
                bl.add(new androidx.webkit.UserAgentMetadata.BrandVersion.Builder()
                        .setBrand("Google Chrome").setMajorVersion(major).setFullVersion(full).build());
                androidx.webkit.UserAgentMetadata md = new androidx.webkit.UserAgentMetadata.Builder()
                        .setBrandVersionList(bl)
                        .setFullVersion(full)
                        .setPlatform("Android")
                        .setPlatformVersion(android.os.Build.VERSION.RELEASE)
                        .setModel(android.os.Build.MODEL)
                        .setMobile(true)
                        .build();
                androidx.webkit.WebSettingsCompat.setUserAgentMetadata(s, md);
            }
        } catch (Throwable ignored) {
        }

        // Real Chrome has a window.chrome object, WebView does not. Add it before any page script runs.
        try {
            if (androidx.webkit.WebViewFeature.isFeatureSupported(androidx.webkit.WebViewFeature.DOCUMENT_START_SCRIPT)) {
                java.util.Set<String> all = new java.util.HashSet<String>();
                all.add("*");
                androidx.webkit.WebViewCompat.addDocumentStartJavaScript(w,
                        "try{if(!window.chrome){window.chrome={runtime:{},app:{isInstalled:false}}}}catch(e){}", all);
            }
        } catch (Throwable ignored) {
        }

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(w, true);

        // file downloads (PDF, Excel ...) open with the phone's own downloader/browser
        w.setDownloadListener(new android.webkit.DownloadListener() {
            @Override
            public void onDownloadStart(String url, String ua2, String cd, String mime, long len) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception e) {
                    Toast.makeText(BrowserActivity.this, "Cannot open download", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private class DsClient extends WebViewClient {
        private final boolean pop;

        DsClient(boolean pop) {
            this.pop = pop;
        }

        @Override
        public android.webkit.WebResourceResponse shouldInterceptRequest(WebView v, android.webkit.WebResourceRequest r) {
            if (adOn && r != null && r.getUrl() != null && isAdHost(r.getUrl().getHost())) {
                return new android.webkit.WebResourceResponse("text/plain", "UTF-8",
                        new java.io.ByteArrayInputStream(new byte[0]));
            }
            return super.shouldInterceptRequest(v, r);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView v, android.webkit.WebResourceRequest r) {
            Uri u = r.getUrl();
            String sch = u.getScheme();
            if (sch == null) return true;
            sch = sch.toLowerCase();
            if ("http".equals(sch) || "https".equals(sch)) return false;
            if ("about".equals(sch) || "data".equals(sch) || "blob".equals(sch) || "javascript".equals(sch)) return false;
            if ("file".equals(sch) || "content".equals(sch)) return true;
            if (adOn && !r.hasGesture()) return true; // ad auto-redirect to another app: blocked
            if ("intent".equals(sch)) {
                try {
                    Intent i = Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME);
                    i.addCategory(Intent.CATEGORY_BROWSABLE);
                    i.setComponent(null);
                    i.setSelector(null);
                    if (i.resolveActivity(getPackageManager()) != null) {
                        startActivity(i);
                    } else {
                        String fb = i.getStringExtra("browser_fallback_url");
                        if (fb != null && fb.startsWith("http")) v.loadUrl(fb);
                    }
                } catch (Exception ignored) {
                }
                return true;
            }
            // tel:, mailto:, market:, whatsapp: ... go to the phone's own app
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, u));
            } catch (Exception ignored) {
            }
            return true;
        }

        @Override
        public void onPageStarted(WebView v, String url, Bitmap icon) {
            if (!pop && url != null && !addr.hasFocus()) addr.setText(url);
            try {
                String ph = url == null ? "" : Uri.parse(url).getHost();
                bridgeOff = ph != null && untrustedSsl.contains(ph);
            } catch (Exception ignored) {
            }
            if (!pop) styleSel(false); // new page = select mode is off again
        }

        @Override
        public void onPageFinished(WebView v, String url) {
            CookieManager.getInstance().flush();
            if (pop) return;
            rememberPage(url, v.getTitle());
            if (adOn) {
                v.evaluateJavascript("(function(){try{var s=document.createElement('style');s.textContent=\""
                        + AD_CSS.replace("'", "\\'") + "\";document.head.appendChild(s)}catch(e){}})()", null);
            }
            bar.setVisibility(View.GONE);
            if (url != null && !addr.hasFocus()) addr.setText(url);
            injectSel();
        }

        /** Certificate problem: ask once per site instead of a dead error page. */
        @Override
        public void onReceivedSslError(WebView v, final android.webkit.SslErrorHandler h, android.net.http.SslError err) {
            String host = "";
            try {
                host = Uri.parse(err.getUrl()).getHost();
            } catch (Exception ignored) {
            }
            if (host == null) host = "";
            if (sslOk.contains(host)) {
                h.proceed();
                return;
            }
            if (sslAsking) {
                h.cancel();
                return;
            }
            String why;
            switch (err.getPrimaryError()) {
                case android.net.http.SslError.SSL_NOTYETVALID:
                case android.net.http.SslError.SSL_EXPIRED:
                case android.net.http.SslError.SSL_DATE_INVALID:
                    why = "Certificate date mile nai. Age phone-er Date & Time thik ache kina dekho (Automatic date & time ON koro).";
                    break;
                case android.net.http.SslError.SSL_IDMISMATCH:
                    why = "Certificate onno site-er name-e.";
                    break;
                default:
                    why = "Certificate trusted na (phone-e root certificate nai, ba network/WiFi beche dicche).";
            }
            final String fhost = host;
            // Login hosts (Google, Claude, Grok): never allow "Continue" on a certificate error.
            // A bad certificate here means a wrong phone clock or someone intercepting the connection.
            String lh = host.toLowerCase();
            if (lh.equals("google.com") || lh.endsWith(".google.com") || lh.endsWith(".googleapis.com")
                    || lh.endsWith(".gstatic.com") || lh.equals("claude.ai") || lh.endsWith(".claude.ai")
                    || lh.endsWith(".anthropic.com") || lh.equals("grok.com") || lh.endsWith(".grok.com")
                    || lh.equals("x.ai") || lh.endsWith(".x.ai")) {
                h.cancel();
                if (!sslAsking) {
                    sslAsking = true;
                    try {
                        new android.app.AlertDialog.Builder(BrowserActivity.this)
                                .setTitle("Certificate problem")
                                .setMessage(fhost + "\n\n" + why + "\n\nSecurity-r jonno ei site-e login-e continue kora jabe na. Phone-er Date & Time (Automatic) thik kore, onno network-e try koro.")
                                .setCancelable(true)
                                .setPositiveButton("OK", new android.content.DialogInterface.OnClickListener() {
                                    @Override
                                    public void onClick(android.content.DialogInterface d, int w) {
                                        sslAsking = false;
                                    }
                                })
                                .setOnCancelListener(new android.content.DialogInterface.OnCancelListener() {
                                    @Override
                                    public void onCancel(android.content.DialogInterface d) {
                                        sslAsking = false;
                                    }
                                })
                                .show();
                    } catch (Exception e) {
                        sslAsking = false;
                    }
                }
                return;
            }
            sslAsking = true;
            try {
                new android.app.AlertDialog.Builder(BrowserActivity.this)
                        .setTitle("Certificate warning")
                        .setMessage(fhost + "\n\n" + why + "\n\nLogin/password dibe na jodi site-ta chino na.")
                        .setCancelable(false)
                        .setPositiveButton("Continue", new android.content.DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(android.content.DialogInterface d, int w) {
                                sslOk.add(fhost);
                                if (!trustedHost(fhost)) {
                                    untrustedSsl.add(fhost);
                                    bridgeOff = true; // no app bridge on a page with a certificate problem
                                }
                                sslAsking = false;
                                h.proceed();
                            }
                        })
                        .setNegativeButton("Cancel", new android.content.DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(android.content.DialogInterface d, int w) {
                                sslAsking = false;
                                h.cancel();
                            }
                        })
                        .show();
            } catch (Exception e) {
                sslAsking = false;
                h.cancel();
            }
        }
    }

    private WebChromeClient makeChrome() {
        return new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView v, int p) {
                if (v != web) return;
                bar.setProgress(p);
                bar.setVisibility(p >= 100 ? View.GONE : View.VISIBLE);
            }

            /** Login popup (Continue with Google, etc.): shown over the page, closes itself when done. */
            @Override
            public boolean onCreateWindow(WebView v, boolean isDialog, boolean isUserGesture, android.os.Message msg) {
                if (adOn && !isUserGesture) return false; // popup ad without a tap: blocked
                closePopup();
                WebView w = new WebView(BrowserActivity.this);
                configure(w);
                w.setWebViewClient(new DsClient(true));
                w.setWebChromeClient(makeChrome());
                popupBox = new FrameLayout(BrowserActivity.this);
                popupBox.setBackgroundColor(Color.WHITE);
                popupBox.addView(w, new FrameLayout.LayoutParams(-1, -1));
                TextView x = btn("\u2715", 18);
                x.setBackgroundColor(Color.parseColor("#e6e9f2"));
                x.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View vv) {
                        closePopup();
                    }
                });
                FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(-2, -2, Gravity.TOP | Gravity.END);
                popupBox.addView(x, lp);
                root.addView(popupBox, new FrameLayout.LayoutParams(-1, -1));
                popup = w;
                WebView.WebViewTransport t = (WebView.WebViewTransport) msg.obj;
                t.setWebView(w);
                msg.sendToTarget();
                return true;
            }

            @Override
            public void onCloseWindow(WebView w) {
                if (w == popup) closePopup();
            }

            // full screen video
            @Override
            public void onShowCustomView(View view, CustomViewCallback cb) {
                if (customView != null) {
                    cb.onCustomViewHidden();
                    return;
                }
                customView = view;
                customCb = cb;
                page.setVisibility(View.GONE);
                root.addView(view, new FrameLayout.LayoutParams(-1, -1));
                getWindow().getDecorView().setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
            }

            @Override
            public void onHideCustomView() {
                hideCustom();
            }
        };
    }

    private void closePopup() {
        if (popupBox != null) {
            try {
                root.removeView(popupBox);
            } catch (Exception ignored) {
            }
            popupBox = null;
        }
        if (popup != null) {
            try {
                popup.stopLoading();
                popup.destroy();
            } catch (Exception ignored) {
            }
            popup = null;
        }
        CookieManager.getInstance().flush();
    }

    private void setup() {
        configure(web);
        web.addJavascriptInterface(new SelBridge(), "DSSelB");
        web.setWebViewClient(new DsClient(false));
        web.setWebChromeClient(makeChrome());
    }

    private void hideCustom() {
        if (customView == null) return;
        root.removeView(customView);
        customView = null;
        page.setVisibility(View.VISIBLE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
        if (customCb != null) {
            try {
                customCb.onCustomViewHidden();
            } catch (Exception ignored) {
            }
            customCb = null;
        }
    }

    private void hideSug() {
        sugSeq++;
        if (sugTask != null) ui.removeCallbacks(sugTask);
        if (sugList != null) sugList.setVisibility(View.GONE);
    }

    private void showSug(java.util.List<Sug> items) {
        sugAdapter.clear();
        for (Sug g : items) sugAdapter.add(g);
        sugList.setVisibility(items.isEmpty() ? View.GONE : View.VISIBLE);
        // list takes the room of the page while typing (page returns when a suggestion is chosen)
        web.setVisibility(items.isEmpty() ? View.VISIBLE : View.INVISIBLE);
    }

    private void scheduleSug(final String q) {
        if (sugTask != null) ui.removeCallbacks(sugTask);
        final int my = ++sugSeq;
        if (q.isEmpty()) {
            sugList.setVisibility(View.GONE);
            web.setVisibility(View.VISIBLE);
            return;
        }
        // 1) visited pages (instant)
        final java.util.ArrayList<Sug> list = new java.util.ArrayList<Sug>();
        try {
            JSONArray h = new JSONArray(getSharedPreferences("dsbrowser", MODE_PRIVATE).getString("hist", "[]"));
            String ql = q.toLowerCase();
            for (int i = 0; i < h.length() && list.size() < 3; i++) {
                JSONObject o = h.getJSONObject(i);
                String u = o.optString("u"), t = o.optString("t");
                if (u.toLowerCase().contains(ql) || t.toLowerCase().contains(ql)) {
                    list.add(new Sug(u, true));
                }
            }
        } catch (Exception ignored) {
        }
        showSug(list);
        // 2) Google suggestions (after a short pause while typing)
        sugTask = new Runnable() {
            @Override
            public void run() {
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        final java.util.ArrayList<Sug> out = new java.util.ArrayList<Sug>(list);
                        try {
                            java.net.URL url = new java.net.URL("https://suggestqueries.google.com/complete/search?client=firefox&q="
                                    + Uri.encode(q));
                            java.net.HttpURLConnection c = (java.net.HttpURLConnection) url.openConnection();
                            c.setConnectTimeout(4000);
                            c.setReadTimeout(4000);
                            InputStream in = c.getInputStream();
                            ByteArrayOutputStream bo = new ByteArrayOutputStream();
                            byte[] buf = new byte[4096];
                            int n;
                            while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
                            in.close();
                            JSONArray r = new JSONArray(bo.toString("UTF-8"));
                            JSONArray a = r.getJSONArray(1);
                            for (int i = 0; i < a.length() && out.size() < 9; i++) out.add(new Sug(a.getString(i), false));
                        } catch (Exception ignored) {
                        }
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                if (my != sugSeq || !addr.hasFocus()) return;
                                showSug(out);
                            }
                        });
                    }
                }).start();
            }
        };
        ui.postDelayed(sugTask, 150);
    }

    /** Remember visited pages for the suggestion list (newest first, max 150). */
    private void rememberPage(String url, String title) {
        if (url == null || !url.startsWith("http")) return;
        try {
            SharedPreferences sp = getSharedPreferences("dsbrowser", MODE_PRIVATE);
            JSONArray old = new JSONArray(sp.getString("hist", "[]"));
            JSONArray a = new JSONArray();
            JSONObject o = new JSONObject();
            o.put("u", url);
            o.put("t", title == null ? "" : title);
            a.put(o);
            for (int i = 0; i < old.length() && a.length() < 150; i++) {
                JSONObject x = old.getJSONObject(i);
                if (!url.equals(x.optString("u"))) a.put(x);
            }
            sp.edit().putString("hist", a.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    /** Address box: a link opens, anything else is searched. */
    private void go() {
        String t = addr.getText().toString().trim();
        if (t.isEmpty()) return;
        String u;
        if (t.matches("(?i)^[a-z][a-z0-9+.-]*://.*")) {
            u = t;
        } else if (t.contains(" ") || !t.contains(".")) {
            u = "https://www.google.com/search?q=" + Uri.encode(t);
        } else {
            u = "https://" + t;
        }
        try {
            InputMethodManager im = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            if (im != null) im.hideSoftInputFromWindow(addr.getWindowToken(), 0);
        } catch (Exception ignored) {
        }
        hideSug();
        web.setVisibility(View.VISIBLE);
        addr.clearFocus();
        web.loadUrl(u);
    }

    /** Selected text, or the whole page text, goes back to Data Show. */
    private void sendBack() {
        final String url = web.getUrl();
        web.evaluateJavascript(
                "(function(){var s=window.getSelection?window.getSelection().toString():'';"
                        + "return (s&&s.trim())?s:(document.body?document.body.innerText:'')})()",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String v) {
                        String text = "";
                        try {
                            Object o = new JSONTokener(v == null ? "\"\"" : v).nextValue();
                            text = o == null ? "" : String.valueOf(o);
                        } catch (Exception ignored) {
                        }
                        if (text.trim().isEmpty() || "null".equals(text)) {
                            Toast.makeText(BrowserActivity.this, "Nothing to send", Toast.LENGTH_SHORT).show();
                            return;
                        }
                        resText = text;
                        resUrl = url;
                        setResult(RESULT_OK);
                        finish();
                    }
                });
    }

    @Override
    public void onBackPressed() {
        if (customView != null) {
            hideCustom();
        } else if (sugList != null && sugList.getVisibility() == View.VISIBLE) {
            hideSug();
            web.setVisibility(View.VISIBLE);
            addr.clearFocus();
        } else if (popup != null) {
            if (popup.canGoBack()) popup.goBack();
            else closePopup();
        } else if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        // keep audio playing is not needed; pause page timers
        if (web != null) web.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onDestroy() {
        closePopup();
        if (web != null) {
            web.stopLoading();
            web.destroy();
        }
        super.onDestroy();
    }
}
