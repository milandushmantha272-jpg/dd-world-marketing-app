package com.ddworld.marketing.bridge

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.SubscriptionManager
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
            resolveFailure(call, "This Android version does not support in-app USSD execution.")
            return
        }

        if (!activity.packageManager.hasSystemFeature("android.hardware.telephony")) {
            resolveFailure(call, "This device does not support mobile telephony.")
            return
        }

        try {
            val baseTelephony = activity.getSystemService(TelephonyManager::class.java)
            val telephony = selectDialogSubscription(baseTelephony)

            if (telephony == null) {
                resolveFailure(call, "No active mobile SIM was found. Please enable the Dialog SIM.")
                return
            }

            telephony.sendUssdRequest(code, object : TelephonyManager.UssdResponseCallback() {
                override fun onReceiveUssdResponse(manager: TelephonyManager, request: String, response: CharSequence) {
                    call.resolve(JSObject().apply {
                        put("status", "USSD_RESPONSE_RECEIVED")
                        put("verified", false)
                        put("message", "USSD response received; Dialog Q/C verification is still required.")
                        put("response", response.toString())
                    })
                }

                override fun onReceiveUssdResponseFailed(manager: TelephonyManager, request: String, failureCode: Int) {
                    resolveFailure(call, "Dialog USSD request failed on the active SIM. Error code: $failureCode")
                }
            }, Handler(Looper.getMainLooper()))
        } catch (error: Exception) {
            resolveFailure(call, error.message ?: "Unable to execute USSD inside the app.")
        }
    }

    private fun selectDialogSubscription(baseTelephony: TelephonyManager?): TelephonyManager? {
        if (baseTelephony == null) return null
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) return baseTelephony

        val subscriptionManager = activity.getSystemService(SubscriptionManager::class.java) ?: return baseTelephony
        val activeSubscriptions = try {
            subscriptionManager.activeSubscriptionInfoList.orEmpty()
        } catch (_: SecurityException) {
            emptyList()
        }

        val dialogSubscription = activeSubscriptions.firstOrNull { info ->
            val carrier = info.carrierName?.toString().orEmpty()
            val display = info.displayName?.toString().orEmpty()
            carrier.contains("Dialog", ignoreCase = true) || display.contains("Dialog", ignoreCase = true)
        }

        val selected = dialogSubscription ?: activeSubscriptions.firstOrNull()
        return if (selected != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            baseTelephony.createForSubscriptionId(selected.subscriptionId)
        } else {
            baseTelephony
        }
    }

    private fun resolveFailure(call: PluginCall, message: String) {
        call.resolve(JSObject().apply {
            put("status", "FAILED")
            put("verified", false)
            put("fallback", false)
            put("message", message)
        })
    }

    private fun callPhone(call: PluginCall, number: String) {
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("phone", call, "permissionCallback")
            return
        }

        try {
            val intent = android.content.Intent(android.content.Intent.ACTION_CALL, android.net.Uri.parse("tel:${number.replace(" ", "")}"))
            activity.startActivity(intent)
            call.resolve(JSObject().apply {
                put("status", "STARTED")
                put("verified", false)
                put("message", "Call request handed to Android telephony; result is unverified.")
            })
        } catch (error: Exception) {
            resolveFailure(call, error.message ?: "Unable to start phone call.")
        }
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        if (getPermissionState("phone") == PermissionState.GRANTED) {
            dialUssd(call)
        } else {
            resolveFailure(call, "Phone permission was not granted. Enable Phone permission in Android Settings.")
        }
    }
}
