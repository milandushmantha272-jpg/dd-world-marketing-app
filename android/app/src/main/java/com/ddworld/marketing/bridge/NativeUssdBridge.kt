package com.ddworld.marketing.bridge

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
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
    permissions = [
        Permission(
            alias = "phone",
            strings = [
                Manifest.permission.CALL_PHONE,
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.READ_PHONE_NUMBERS
            ]
        )
    ]
)
class NativeUssdBridge : Plugin() {
    @PluginMethod
    fun dialUssd(call: PluginCall) {
        val raw = call.getString("code")?.trim().orEmpty()
        val isValid = Regex("^[0-9+*#(),;N -]{1,32}$").matches(raw)

        if (!isValid || raw.isBlank()) {
            call.reject("Unsupported dial string")
            return
        }

        when (UssdActivationRouting.transportFor(raw)) {
            UssdActivationRouting.Transport.DIRECT_USSD_REQUEST -> sendUssd(call, raw)
            UssdActivationRouting.Transport.PHONE_CALL -> callPhone(call, raw)
        }
    }

    private fun sendUssd(call: PluginCall, code: String) {
        if (!hasPhonePermissions()) {
            requestPermissionForAlias("phone", call, "permissionCallback")
            return
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.resolve(JSObject().apply {
                put("status", "UNSUPPORTED_API")
                put("message", "Direct in-app USSD requires Android 8.0 (API 26) or newer.")
            })
            return
        }

        val telephony = selectDialogTelephonyManager()
        if (telephony == null) {
            call.resolve(JSObject().apply {
                put("status", "NO_ACTIVE_SIM")
                put("message", "Dialog SIM එකක් active/default ලෙස හඳුනාගත නොහැක.")
            })
            return
        }

        try {
            telephony.sendUssdRequest(code, object : TelephonyManager.UssdResponseCallback() {
                override fun onReceiveUssdResponse(
                    manager: TelephonyManager,
                    request: String,
                    response: CharSequence
                ) {
                    call.resolve(JSObject().apply {
                        put("status", "SUCCESS")
                        put("message", "USSD response received.")
                        put("response", response.toString())
                    })
                }

                override fun onReceiveUssdResponseFailed(
                    manager: TelephonyManager,
                    request: String,
                    failureCode: Int
                ) {
                    call.resolve(JSObject().apply {
                        put("status", "FAILED")
                        put("failureCode", failureCode)
                        put("message", when (failureCode) {
                            TelephonyManager.USSD_RETURN_FAILURE ->
                                "Dialog network failed to complete the USSD request."
                            TelephonyManager.USSD_ERROR_SERVICE_UNAVAIL ->
                                "USSD service is unavailable on the selected Dialog SIM."
                            else ->
                                "Android telephony rejected the USSD request."
                        })
                    })
                }
            }, Handler(Looper.getMainLooper()))
        } catch (_: SecurityException) {
            call.resolve(JSObject().apply {
                put("status", "PERMISSION_DENIED")
                put("message", "Phone/SIM permission was not granted.")
            })
        } catch (error: Exception) {
            call.resolve(JSObject().apply {
                put("status", "FAILED")
                put("message", error.message ?: "Unable to send USSD request.")
            })
        }
    }

    private fun hasPhonePermissions(): Boolean {
        return ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.CALL_PHONE
        ) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.READ_PHONE_STATE
            ) == PackageManager.PERMISSION_GRANTED
    }

    private fun selectDialogSubscriptionId(): Int? {
        val subscriptionManager =
            activity.getSystemService(SubscriptionManager::class.java) ?: return null

        val subscriptions = try {
            subscriptionManager.activeSubscriptionInfoList.orEmpty()
        } catch (_: SecurityException) {
            return null
        }

        val dialogSub = subscriptions.firstOrNull {
            it.carrierName?.toString()?.contains("dialog", ignoreCase = true) == true
        }

        return dialogSub?.subscriptionId
            ?: SubscriptionManager.getDefaultVoiceSubscriptionId().takeIf {
                it != SubscriptionManager.INVALID_SUBSCRIPTION_ID
            }
            ?: SubscriptionManager.getDefaultDataSubscriptionId().takeIf {
                it != SubscriptionManager.INVALID_SUBSCRIPTION_ID
            }
            ?: subscriptions.firstOrNull()?.subscriptionId
    }

    private fun selectDialogTelephonyManager(): TelephonyManager? {
        val selectedId = selectDialogSubscriptionId() ?: return null

        return activity.getSystemService(TelephonyManager::class.java)
            ?.createForSubscriptionId(selectedId)
    }

    private fun callPhone(call: PluginCall, number: String) {
        if (ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.CALL_PHONE
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissionForAlias("phone", call, "permissionCallback")
            return
        }

        try {
            activity.startActivity(
                Intent(
                    Intent.ACTION_CALL,
                    Uri.parse("tel:" + number.replace(" ", ""))
                )
            )

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
            call.reject("Phone permission was not granted")
        }
    }
}
