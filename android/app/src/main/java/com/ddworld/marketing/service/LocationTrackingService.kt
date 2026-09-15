package com.ddworld.marketing.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.location.Location
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class LocationTrackingService : Service() {

    companion object {
        private const val TAG = "LocationTrackingService"
        const val CHANNEL_ID = "ddworld_location_channel"
        const val NOTIFICATION_ID = 8801
        const val ACTION_START = "com.ddworld.marketing.ACTION_START"
        const val ACTION_STOP = "com.ddworld.marketing.ACTION_STOP"
        const val EXTRA_EMPLOYEE_ID = "extra_employee_id"
        const val EXTRA_AGENT_CODE = "extra_agent_code"
        const val EXTRA_TEAM_ID = "extra_team_id"
        const val EXTRA_SESSION_ID = "extra_session_id"
        const val EXTRA_SUPABASE_ACCESS_TOKEN = "extra_supabase_access_token"

        @Volatile
        var isServiceRunning = false
            private set
    }

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var employeeId: String = ""
    private var agentCode: String = ""
    private var teamId: String = ""
    private var trackingSessionId: String = ""
    private var supabaseAccessToken: String = ""
    private var authReady = false

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (location in locationResult.locations) processRealGpsLocation(location)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopTrackingService()
            return START_NOT_STICKY
        }

        employeeId = intent?.getStringExtra(EXTRA_EMPLOYEE_ID) ?: getSavedPref("employeeId")
        agentCode = intent?.getStringExtra(EXTRA_AGENT_CODE) ?: getSavedPref("agentCode")
        teamId = intent?.getStringExtra(EXTRA_TEAM_ID) ?: getSavedPref("teamId")
        trackingSessionId = intent?.getStringExtra(EXTRA_SESSION_ID) ?: getSavedPref("trackingSessionId")
        // Never restore a Supabase access token from disk. A fresh authenticated
        // session must explicitly provide the token when tracking starts.
        supabaseAccessToken = intent?.getStringExtra(EXTRA_SUPABASE_ACCESS_TOKEN) ?: ""

        if (employeeId.isNotEmpty()) {
            savePref("employeeId", employeeId)
            savePref("agentCode", agentCode)
            savePref("teamId", teamId)
            savePref("trackingSessionId", trackingSessionId)
        }

        startForeground(NOTIFICATION_ID, createForegroundNotification())
        isServiceRunning = true
        authenticateSupabaseAndStartTracking()
        // Do not allow Android to resurrect a service without a fresh Supabase token.
        return START_NOT_STICKY
    }

    private fun authenticateSupabaseAndStartTracking() {
        if (supabaseAccessToken.isEmpty()) {
            Log.e(TAG, "No fresh Supabase access token; refusing GPS uploads")
            authReady = false
            isServiceRunning = false
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return
        }
        authReady = true
        Log.d(TAG, "Authorized Supabase session received for background GPS")
        startRealLocationUpdates()
    }

    private fun startRealLocationUpdates() {
        if (!authReady) return
        try {
            val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 15000L)
                .setMinUpdateIntervalMillis(5000L)
                .setWaitForAccurateLocation(false)
                .build()
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
            Log.d(TAG, "Native FusedLocationProviderClient started successfully")
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission missing for Native Service", e)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start location updates", e)
        }
    }

    private fun processRealGpsLocation(location: Location) {
        if (!authReady) return
        if (!isApprovedWorkingHours()) {
            Log.d(TAG, "Outside approved working hours (08:00 AM - 08:00 PM Colombo). Skipping official record.")
            return
        }

        val isNetworkAvailable = isNetworkOnline()
        val recordJson = JSONObject().apply {
            put("employeeId", employeeId)
            put("agentCode", agentCode)
            put("teamId", teamId)
            put("trackingSessionId", trackingSessionId)
            put("latitude", location.latitude)
            put("longitude", location.longitude)
            put("accuracy", location.accuracy.toDouble())
            put("speed", location.speed.toDouble())
            put("heading", location.bearing.toDouble())
            put("altitude", location.altitude)
            put("timestamp", getIsoTimestamp(location.time))
            put("batteryLevel", getBatteryLevel())
            put("networkStatus", if (isNetworkAvailable) "ONLINE" else "OFFLINE")
            put("gpsStatus", "ACTIVE_HIGH_ACCURACY")
            put("appState", "BACKGROUND_NATIVE_SERVICE")
            put("source", "NATIVE_ANDROID_GPS")
        }

        Log.d(TAG, "REAL Native GPS Captured: lat=${location.latitude}, lng=${location.longitude}, acc=${location.accuracy}m")
        if (isNetworkAvailable) {
            syncRecordToCloud(recordJson)
            flushOfflineQueue()
        } else {
            enqueueOfflineRecord(recordJson)
        }
    }

    private fun isApprovedWorkingHours(): Boolean {
        val calendar = Calendar.getInstance(TimeZone.getTimeZone("Asia/Colombo"))
        return calendar.get(Calendar.HOUR_OF_DAY) in 8..19
    }

    private fun getBatteryLevel(): Int {
        val batteryStatus = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (level >= 0 && scale > 0) level * 100 / scale else 100
    }

    private fun isNetworkOnline(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val net = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(net) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun getIsoTimestamp(timeMs: Long): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date(if (timeMs > 0) timeMs else System.currentTimeMillis()))
    }

    private fun configureAuthenticatedConnection(conn: HttpURLConnection) {
        if (supabaseAccessToken.isBlank()) throw IllegalStateException("Supabase access token unavailable")
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Authorization", "Bearer $supabaseAccessToken")
        conn.doOutput = true
        conn.connectTimeout = 10000
        conn.readTimeout = 10000
    }

    private fun syncRecordToCloud(record: JSONObject) {
        Thread {
            try {
                val url = URL("https://ais-dev-x3vgvdkcnqcxy6kg52vg7i-814098050496.asia-east1.run.app/api/native-gps-sync")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                configureAuthenticatedConnection(conn)
                OutputStreamWriter(conn.outputStream).use { it.write(record.toString()) }
                val responseCode = conn.responseCode
                Log.d(TAG, "Authenticated cloud sync response code: $responseCode")
                conn.disconnect()
                if (responseCode !in 200..299) enqueueOfflineRecord(record)
            } catch (e: Exception) {
                Log.e(TAG, "Network sync failed, queuing record offline", e)
                enqueueOfflineRecord(record)
            }
        }.start()
    }

    private fun enqueueOfflineRecord(record: JSONObject) {
        val prefs = getSharedPreferences("ddworld_gps_queue", Context.MODE_PRIVATE)
        val queue = JSONArray(prefs.getString("queue", "[]") ?: "[]")
        queue.put(record)
        while (queue.length() > 200) queue.remove(0)
        prefs.edit().putString("queue", queue.toString()).apply()
        Log.d(TAG, "Offline GPS record queued. Queue count: ${queue.length()}")
    }

    private fun flushOfflineQueue() {
        val prefs = getSharedPreferences("ddworld_gps_queue", Context.MODE_PRIVATE)
        val queue = JSONArray(prefs.getString("queue", "[]") ?: "[]")
        if (queue.length() == 0 || !authReady) return
        Thread {
            try {
                val url = URL("https://ais-dev-x3vgvdkcnqcxy6kg52vg7i-814098050496.asia-east1.run.app/api/native-gps-batch-sync")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                configureAuthenticatedConnection(conn)
                OutputStreamWriter(conn.outputStream).use { it.write(queue.toString()) }
                val code = conn.responseCode
                if (code in 200..299) {
                    prefs.edit().putString("queue", "[]").apply()
                    Log.d(TAG, "Flushed ${queue.length()} offline records to cloud.")
                }
                conn.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "Offline queue flush error", e)
            }
        }.start()
    }

    private fun createForegroundNotification(): Notification = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("DD WORLD GPS Tracking Active 🟢")
        .setContentText("Authenticated field location service running in background")
        .setSmallIcon(android.R.drawable.ic_menu_compass)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setOngoing(true)
        .build()

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "DD WORLD Location Service", NotificationManager.IMPORTANCE_LOW)
                .apply { description = "Persistent Notification for DD WORLD Field Agent Background Tracking" }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun stopTrackingService() {
        try { fusedLocationClient.removeLocationUpdates(locationCallback) } catch (e: Exception) { Log.e(TAG, "Error removing location updates", e) }
        isServiceRunning = false
        authReady = false
        supabaseAccessToken = ""
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        Log.d(TAG, "Native Location Tracking Service stopped cleanly")
    }

    override fun onDestroy() {
        stopTrackingService()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun savePref(key: String, value: String) {
        getSharedPreferences("ddworld_native_gps", Context.MODE_PRIVATE).edit().putString(key, value).apply()
    }

    private fun getSavedPref(key: String): String =
        getSharedPreferences("ddworld_native_gps", Context.MODE_PRIVATE).getString(key, "") ?: ""
}