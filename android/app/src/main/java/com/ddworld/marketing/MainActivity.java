package com.ddworld.marketing;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;
import com.ddworld.marketing.bridge.NativeGpsBridge;
import com.ddworld.marketing.bridge.NativeUssdBridge;

public class MainActivity extends BridgeActivity {
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
    }
}
