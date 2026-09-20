package com.ddworld.marketing.bridge

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import com.getcapacitor.JSObject
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
        val isApprovedUssd = raw == "#616#" || raw == "#828#"
        val isPhoneNumber = Regex("^[0-9+*#(),;N -]{1,32}$").matches(raw)

        if (!isApprovedUssd && !isPhoneNumber) {
            call.reject("Unsupported dial string")
            return
        }

        // Keep USSD control characters intact; encode only the # characters.
        // For normal phone calls, remove visual spaces before creating the tel URI.
        val dialString = if (isApprovedUssd || raw.contains("*")) {
            raw.replace("#", "%23").replace(" ", "")
        } else {
            raw.replace(" ", "")
        }
        val uri = Uri.parse("tel:$dialString")

        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M &&
                activity.checkSelfPermission(Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED
            ) {
                requestPermissionForAlias("phone", call, "permissionCallback")
                return
            }

            activity.startActivity(Intent(Intent.ACTION_CALL, uri))
            call.resolve(JSObject().apply {
                put("status", "STARTED")
                put("message", "Call request handed to Android telephony.")
            })
        } catch (e: SecurityException) {
            call.reject("CALL_PHONE permission is required", e)
        } catch (e: Exception) {
            try {
                activity.startActivity(Intent(Intent.ACTION_DIAL, uri))
                call.resolve(JSObject().apply {
                    put("status", "DIALER_FALLBACK")
                    put("message", "Native dialer opened.")
                })
            } catch (fallbackError: Exception) {
                call.reject("Unable to open the phone dialer", fallbackError)
            }
        }
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        if (getPermissionState("phone") == com.getcapacitor.PermissionState.GRANTED) {
            dialUssd(call)
        } else {
            call.reject("CALL_PHONE permission was not granted")
        }
    }
}
