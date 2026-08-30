package com.aegis.game;

import android.os.Bundle;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private OnBackPressedCallback webBackCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webBackCallback = new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() == null || getBridge().getWebView() == null) {
                    fallBackToSystemBack();
                    return;
                }

                getBridge().getWebView().evaluateJavascript(
                    "(function(){try{return typeof window.handleAndroidBack==='function'&&window.handleAndroidBack()===true}catch(e){return false}})()",
                    result -> {
                        if (!"true".equals(result)) fallBackToSystemBack();
                    }
                );
            }
        };
        getOnBackPressedDispatcher().addCallback(this, webBackCallback);
    }

    private void fallBackToSystemBack() {
        webBackCallback.setEnabled(false);
        getOnBackPressedDispatcher().onBackPressed();
        webBackCallback.setEnabled(true);
    }
}
