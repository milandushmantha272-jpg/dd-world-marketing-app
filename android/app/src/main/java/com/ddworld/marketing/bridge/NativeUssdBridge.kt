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
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.resolve(JSObject().apply {
                put("status", "UNSUPPORTED_API")
                put("message", "Android 8.0 or newer is required for in-app USSD.")
            })
            return
        }

        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("phone", call, "permissionCallback")
            return
        }

        val telephony = activity.getSystemService(TelephonyManager::class.java)
        if (telephony == null || !activity.packageManager.hasSystemFeature("android.hardware.telephony")) {
            call.resolve(JSObject().apply {
                put("status", "UNSUPPORTED_DEVICE")
                put("message", "This device does not support mobile telephony.")
            })
            return
        }

        try {
            telephony.sendUssdRequest(code, object : TelephonyManager.UssdResponseCallback() {
                override fun onReceiveUssdResponse(manager: TelephonyManager, request: String, response: CharSequence) {
                    call.resolve(JSObject().apply {
                        put("status", "SUCCESS")
                        put("message", "USSD response received.")
                        put("response", response.toString())
                    })
                }

                override fun onReceiveUssdResponseFailed(manager: TelephonyManager, request: String, failureCode: Int) {
                    call.resolve(JSObject().apply {
                        put("status", "FAILED")
                        put("message", "Dialog network/carrier rejected the USSD request.")
                        put("failureCode", failureCode)
                    })
                }
            }, Handler(Looper.getMainLooper()))
        } catch (error: Exception) {
            call.resolve(JSObject().apply {
                put("status", "FAILED")
                put("message", error.message ?: "Unable to send USSD request.")
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
                put("message", "Call request handed to Android telephony.")
            })
        } catch (error: Exception) {
            call.reject("Unable to start phone call", error)
        }
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        if (getPermissionState("phone") == PermissionState.GRANTED) {
            dialUssd(call)
        } else {
            call.reject("CALL_PHONE permission was not granted")
        }
    }
}
