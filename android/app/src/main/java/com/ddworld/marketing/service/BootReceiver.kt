package com.ddworld.marketing.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.util.Calendar
import java.util.TimeZone

class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "DDWorldBootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val incomingAction = intent.action
        Log.d(TAG, "BootReceiver triggered with action: $incomingAction")

        if (Intent.ACTION_BOOT_COMPLETED != incomingAction && incomingAction != "android.intent.action.MY_PACKAGE_REPLACED") return

        val prefs = context.getSharedPreferences("ddworld_native_gps", Context.MODE_PRIVATE)
        val employeeId = prefs.getString("employeeId", "") ?: ""
        val agentCode = prefs.getString("agentCode", "") ?: ""
        val teamId = prefs.getString("teamId", "") ?: ""
        val trackingSessionId = prefs.getString("trackingSessionId", "") ?: ""
        val supabaseAccessToken = prefs.getString("supabaseAccessToken", "") ?: ""
        val isAuthorized = prefs.getBoolean("isAuthorizedSessionActive", false)

        if (!isAuthorized || employeeId.isEmpty() || trackingSessionId.isEmpty() || supabaseAccessToken.isEmpty()) {
            Log.d(TAG, "No authorized Supabase tracking session found after boot. Will NOT auto-start tracking.")
            return
        }

        val calendar = Calendar.getInstance(TimeZone.getTimeZone("Asia/Colombo"))
        if (calendar.get(Calendar.HOUR_OF_DAY) !in 8..19) {
            Log.d(TAG, "Device booted outside authorized working hours. Will NOT start tracking.")
            return
        }

        Log.d(TAG, "Valid Supabase-authenticated tracking session found after boot ($trackingSessionId). Resuming native service.")
        val serviceIntent = Intent(context, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_START
            putExtra(LocationTrackingService.EXTRA_EMPLOYEE_ID, employeeId)
            putExtra(LocationTrackingService.EXTRA_AGENT_CODE, agentCode)
            putExtra(LocationTrackingService.EXTRA_TEAM_ID, teamId)
            putExtra(LocationTrackingService.EXTRA_SESSION_ID, trackingSessionId)
            putExtra(LocationTrackingService.EXTRA_SUPABASE_ACCESS_TOKEN, supabaseAccessToken)
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to resume authorized tracking after boot", e)
        }
    }
}
