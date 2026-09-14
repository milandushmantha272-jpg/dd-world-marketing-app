package com.ddworld.marketing.service

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth

object NativeFirebaseAuth {
    private const val PROJECT_ID = "dd-world-app-dushmsntha"
    private const val APPLICATION_ID = "1:1031838170425:web:cf3905ca9d59870db23ce8"
    private const val API_KEY = "AIzaSyB8ejwvl1W5KYHUAbfGb7LoSV2C3DC_oQmE"

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
