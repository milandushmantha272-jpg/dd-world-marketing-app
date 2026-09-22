package com.ddworld.marketing.bridge

import android.Manifest
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
import java.nio.charset.StandardCharsets

@CapacitorPlugin(
    name = "NativeUssdBridge",
    permissions = [Permission(alias = "phone", strings = [Manifest.permission.CALL_PHONE, Manifest.permission.READ_PHONE_STATE])]
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
                    startEncodedTelephonyFallback(call, request, failureCode)
                }
            }, Handler(Looper.getMainLooper()))
        } catch (error: SecurityException) {
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

    private fun startEncodedTelephonyFallback(call: PluginCall, request: String, failureCode: Int) {
        try {
            activity.startActivity(
                Intent(Intent.ACTION_CALL, buildUssdFallbackUri(request))
            )
            call.resolve(JSObject().apply {
                put("status", "FALLBACK_STARTED")
                put("failureCode", failureCode)
                put("message", "Direct USSD API was rejected; Android telephony was started with the encoded USSD code.")
            })
        } catch (error: SecurityException) {
            call.resolve(JSObject().apply {
                put("status", "PERMISSION_DENIED")
                put("failureCode", failureCode)
                put("message", "Phone permission was not granted for the USSD fallback.")
            })
        } catch (error: Exception) {
            call.resolve(JSObject().apply {
                put("status", "FAILED")
                put("failureCode", failureCode)
                put("message", error.message ?: "Android telephony could not start the USSD fallback.")
            })
        }
    }

    internal companion object {
        private const val HEX = "0123456789ABCDEF"

        fun encodeUssdForTelUri(code: String): String {
            val bytes = code.toByteArray(StandardCharsets.UTF_8)
            val out = StringBuilder(bytes.size)
            for (byte in bytes) {
                val value = byte.toInt() and 0xFF
                val safe = value in 'a'.code..'z'.code ||
                    value in 'A'.code..'Z'.code ||
                    value in '0'.code..'9'.code ||
                    value == '-'.code || value == '_'.code || value == '.'.code ||
                    value == '!'.code || value == '~'.code || value == '*'.code ||
                    value == '\''.code || value == '('.code || value == ')'.code

                if (safe) {
                    out.append(value.toChar())
                } else {
                    out.append('%')
                    out.append(HEX[value ushr 4])
                    out.append(HEX[value and 0x0F])
                }
            }
            return out.toString()
        }

        fun buildUssdFallbackUri(code: String): Uri {
            return Uri.parse("tel:" + encodeUssdForTelUri(code))
        }
    }

    private fun hasPhonePermissions(): Boolean {
        return ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
    }

    private fun selectDialogTelephonyManager(): TelephonyManager? {
        val subscriptionManager = activity.getSystemService(SubscriptionManager::class.java) ?: return null
        val subscriptions = try {
            subscriptionManager.activeSubscriptionInfoList.orEmpty()
        } catch (_: SecurityException) {
            return null
        }

        val dialogSub = subscriptions.firstOrNull {
            it.carrierName?.toString()?.contains("dialog", ignoreCase = true) == true
        }

        val selectedId = dialogSub?.subscriptionId
            ?: SubscriptionManager.getDefaultVoiceSubscriptionId().takeIf {
                it != SubscriptionManager.INVALID_SUBSCRIPTION_ID
            }
            ?: SubscriptionManager.getDefaultDataSubscriptionId().takeIf {
                it != SubscriptionManager.INVALID_SUBSCRIPTION_ID
            }
            ?: subscriptions.firstOrNull()?.subscriptionId
            ?: return null

        return activity.getSystemService(TelephonyManager::class.java)
            ?.createForSubscriptionId(selectedId)
    }

    private fun callPhone(call: PluginCall, number: String) {
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("phone", call, "permissionCallback")
            return
        }

        try {
            activity.startActivity(Intent(Intent.ACTION_CALL, Uri.parse("tel:" + number.replace(" ", ""))))
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
