package com.ddworld.marketing.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String APP_RESET_PATH = "https://localhost/reset-password";

    @Override
    public void onCreate(Bundle savedInstanceState) {
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
        if (data == null || !"com.ddworld.marketing.app".equalsIgnoreCase(data.getScheme()) || !"reset-password".equalsIgnoreCase(data.getHost())) return;
        StringBuilder target = new StringBuilder(APP_RESET_PATH);
        if (data.getQuery() != null) target.append('?').append(data.getQuery());
        if (data.getFragment() != null) target.append('#').append(data.getFragment());
        if (getBridge() != null && getBridge().getWebView() != null) getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(target.toString()));
    }
}
