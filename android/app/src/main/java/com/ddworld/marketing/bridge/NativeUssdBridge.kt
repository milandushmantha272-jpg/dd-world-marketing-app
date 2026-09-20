package com.ddworld.marketing.bridge

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "NativeUssdBridge",
    permissions = [Permission(alias = "phone", strings = [Manifest.permission.CALL_PHONE])]
)
class NativeUssdBridge : Plugin() {
    @PluginMethod
    fun dialUssd(call: PluginCall) {
        val raw = call.getString("code")?.trim().orEmpty()
        val isUssd = raw.startsWith("*") || raw.startsWith("#")
        val isValid = Regex("^[0-9+*#(),;N -]{1,32}$").matches(raw)

        if (!isValid || raw.isBlank()) {
            call.reject("Unsupported dial string")
            return
        }

        if (isUssd) sendUssd(call, raw) else callPhone(call, raw)
    }

    private fun sendUssd(call: PluginCall, code: String) {
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("phone", call, "permissionCallback")
            return
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            launchNativeDialer(call, code)
            return
        }

        val telephony = activity.getSystemService(TelephonyManager::class.java)
        if (telephony == null || !activity.packageManager.hasSystemFeature("android.hardware.telephony")) {
            call.resolve(JSObject().apply {
                put("status", "UNSUPPORTED_DEVICE")
                put("verified", false)
                put("message", "This device does not support mobile telephony.")
            })
            return
        }

        try {
            telephony.sendUssdRequest(code, object : TelephonyManager.UssdResponseCallback() {
                override fun onReceiveUssdResponse(manager: TelephonyManager, request: String, response: CharSequence) {
                    call.resolve(JSObject().apply {
                        put("status", "USSD_RESPONSE_RECEIVED")
                        put("verified", false)
                        put("message", "USSD response received; Dialog Q/C verification is still required.")
                    })
                }

                override fun onReceiveUssdResponseFailed(manager: TelephonyManager, request: String, failureCode: Int) {
                    launchNativeDialer(call, code)
                }
            }, Handler(Looper.getMainLooper()))
        } catch (error: Exception) {
            launchNativeDialer(call, code)
        }
    }

    private fun launchNativeDialer(call: PluginCall, code: String) {
        try {
            val encodedCode = Uri.encode(code)
            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$encodedCode"))
            activity.startActivity(intent)
            call.resolve(JSObject().apply {
                put("status", "DIALER_FALLBACK")
                put("verified", false)
                put("message", "Dialer opened. Complete the USSD flow manually; final result is unverified.")
                put("fallback", true)
            })
        } catch (error: Exception) {
            call.resolve(JSObject().apply {
                put("status", "FAILED")
                put("verified", false)
                put("message", error.message ?: "Unable to open native dialer.")
            })
        }
    }

    private fun callPhone(call: PluginCall, number: String) {
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("phone", call, "permissionCallback")
            return
        }

        try {
            activity.startActivity(Intent(Intent.ACTION_CALL, Uri.parse("tel:${number.replace(" ", "")}")))
            call.resolve(JSObject().apply {
                put("status", "STARTED")
                put("verified", false)
                put("message", "Call request handed to Android telephony; result is unverified.")
            })
        } catch (error: Exception) {
            call.resolve(JSObject().apply {
                put("status", "FAILED")
                put("verified", false)
                put("message", error.message ?: "Unable to start phone call.")
            })
        }
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        if (getPermissionState("phone") == PermissionState.GRANTED) {
            dialUssd(call)
        } else {
            call.resolve(JSObject().apply {
                put("status", "PERMISSION_DENIED")
                put("verified", false)
                put("message", "Phone permission was not granted. Enable Phone permission in Android Settings.")
            })
        }
    }
}
