package com.ddworld.marketing.service

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth

object NativeFirebaseAuth {
    private const val PROJECT_ID = "phat-osprey-d6shk"
    private const val APPLICATION_ID = "1:869043614850:web:9141f9c27184846c94b09b"
    private const val API_KEY = "AIzaSyCz-5puonwrxk9NldOkvhuzz4qagDRbWGc"

    fun auth(context: Context): FirebaseAuth {
        if (FirebaseApp.getApps(context).isEmpty()) {
            val options = FirebaseOptions.Builder()
                .setProjectId(PROJECT_ID)
                .setApplicationId(APPLICATION_ID)
                .setApiKey(API_KEY)
                .build()
            FirebaseApp.initializeApp(context, options)
        }
        return FirebaseAuth.getInstance()
    }
}
