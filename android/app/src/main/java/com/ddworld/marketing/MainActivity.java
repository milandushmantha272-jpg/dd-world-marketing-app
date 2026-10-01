package com.ddworld.marketing;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;
import com.ddworld.marketing.bridge.NativeGpsBridge;
import com.ddworld.marketing.bridge.NativeUssdBridge;

public class MainActivity extends BridgeActivity {
    private static final String APP_RESET_SCHEME = "com.ddworld.marketing.app";
    private static final String APP_RESET_HOST = "reset-password";
    private static final String APP_RESET_PATH = "https://localhost/reset-password";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Corporate employee ID / KYC surfaces must remain app-only on Android.
        // FLAG_SECURE prevents screenshots, screen recording and non-secure display capture.
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE
        );
        registerPlugin(NativeGpsBridge.class);
        registerPlugin(NativeUssdBridge.class);
        super.onCreate(savedInstanceState);
        handleResetIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleResetIntent(intent);
    }

    private void handleResetIntent(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data == null
                || !APP_RESET_SCHEME.equalsIgnoreCase(data.getScheme())
                || !APP_RESET_HOST.equalsIgnoreCase(data.getHost())) {
            return;
        }

        StringBuilder target = new StringBuilder(APP_RESET_PATH);
        if (data.getQuery() != null) target.append('?').append(data.getQuery());
        if (data.getFragment() != null) target.append('#').append(data.getFragment());

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(target.toString()));
        }
    }
}
