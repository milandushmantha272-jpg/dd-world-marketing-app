package com.ddworld.marketing.bridge

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.telephony.SubscriptionInfo
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
    permissions = [
        Permission(
            alias = "phone",
            strings = [
                Manifest.permission.CALL_PHONE,
                Manifest.permission.READ_PHONE_STATE
            ]
        )
    ]
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
        if (!hasPhonePermissions()) {
            requestPermissionForAlias("phone", call, "permissionCallback")
            return
        }

        if (!activity.packageManager.hasSystemFeature("android.hardware.telephony")) {
            resolveFailure(call, "This device does not support mobile telephony.")
            return
        }

        val baseTelephony = activity.getSystemService(TelephonyManager::class.java)
        val selectedSubscription = findDialogSubscription()

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || baseTelephony == null) {
            startTelephonyCall(call, code, selectedSubscription, "Android in-app USSD is unavailable.")
            return
        }

        try {
            val telephony = if (selectedSubscription != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                baseTelephony.createForSubscriptionId(selectedSubscription.subscriptionId)
            } else {
                baseTelephony
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
                    startTelephonyCall(call, code, selectedSubscription, "Direct in-app USSD failed with error code $failureCode.")
                }
            }, Handler(Looper.getMainLooper()))
        } catch (error: Exception) {
            startTelephonyCall(call, code, selectedSubscription, error.message ?: "Direct in-app USSD failed.")
        }
    }
    private fun findDialogSubscription(): SubscriptionInfo? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) return null

        val subscriptionManager = activity.getSystemService(SubscriptionManager::class.java) ?: return null
        val activeSubscriptions = try {
            subscriptionManager.activeSubscriptionInfoList.orEmpty()
        } catch (_: SecurityException) {
            emptyList()
        }

        return activeSubscriptions.firstOrNull { info ->
            val carrier = info.carrierName?.toString().orEmpty()
            val display = info.displayName?.toString().orEmpty()
            carrier.contains("Dialog", ignoreCase = true) || display.contains("Dialog", ignoreCase = true)
        } ?: activeSubscriptions.firstOrNull()
    }

    private fun startTelephonyCall(call: PluginCall, dialString: String, subscription: SubscriptionInfo?, reason: String) {
        if (!hasPhonePermissions()) {
            resolveFailure(call, "$reason Phone permission is not granted.")
            return
        }

        try {
            val uri = Uri.fromParts("tel", dialString.replace(" ", ""), null)
            val telecom = activity.getSystemService(TelecomManager::class.java)

            if (telecom != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val extras = Bundle()
                findPhoneAccountHandle(telecom, subscription)?.let { handle ->
                    extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, handle)
                }
                telecom.placeCall(uri, extras)
            } else {
                activity.startActivity(Intent(Intent.ACTION_CALL, uri))
            }

            call.resolve(JSObject().apply {
                put("status", "FALLBACK_STARTED")
                put("verified", false)
                put("fallback", true)
                put("message", "$reason Android telephony call started.")
            })
        } catch (error: Exception) {
            resolveFailure(call, "$reason ${error.message ?: "Unable to start Android telephony call."}")
        }
    }

    private fun findPhoneAccountHandle(telecom: TelecomManager, subscription: SubscriptionInfo?): PhoneAccountHandle? {
        val accounts = try {
            telecom.callCapablePhoneAccounts.orEmpty()
        } catch (_: SecurityException) {
            emptyList()
        }

        if (accounts.isEmpty()) return null
        if (subscription == null) return if (accounts.size == 1) accounts.first() else null

        val subId = subscription.subscriptionId
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            accounts.firstOrNull { handle ->
                try { activity.getSystemService(TelephonyManager::class.java)?.getSubscriptionId(handle) == subId } catch (_: SecurityException) { false }
            }?.let { return it }
        }

        return accounts.firstOrNull { handle ->
            handle.id == subId.toString() || handle.id.contains(subId.toString())
        } ?: if (accounts.size == 1) accounts.first() else null
    }

    private fun hasPhonePermissions(): Boolean {
        val callGranted = ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED
        val stateGranted = ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
        return callGranted && stateGranted
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
        if (!hasPhonePermissions()) {
            requestPermissionForAlias("phone", call, "permissionCallback")
            return
        }

        try {
            val uri = Uri.fromParts("tel", number.replace(" ", ""), null)
            val telecom = activity.getSystemService(TelecomManager::class.java)
            val subscription = findDialogSubscription()

            if (telecom != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val extras = Bundle()
                findPhoneAccountHandle(telecom, subscription)?.let { handle ->
                    extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, handle)
                }
                telecom.placeCall(uri, extras)
            } else {
                activity.startActivity(Intent(Intent.ACTION_CALL, uri))
            }

            call.resolve(JSObject().apply {
                put("status", "STARTED")
                put("verified", false)
                put("message", "Call request handed to Android telephony.")
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
            resolveFailure(call, "Phone and SIM permission was not granted. Enable Phone permission in Android Settings.")
        }
    }
}
