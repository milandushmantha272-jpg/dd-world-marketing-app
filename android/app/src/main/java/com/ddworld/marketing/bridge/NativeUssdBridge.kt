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

@CapacitorPlugin(
    name = "NativeUssdBridge",
    permissions = [Permission(alias = "phone", strings = [Manifest.permission.CALL_PHONE])]
)
class NativeUssdBridge : Plugin() {
    @PluginMethod
    fun dialUssd(call: PluginCall) {
        val dialString = call.getString("code")?.trim().orEmpty()

        // Accept ordinary phone numbers and only the two company-approved IVR codes.
        val isApprovedUssd = dialString == "#616#" || dialString == "#828#"
        val isPhoneNumber = Regex("^[0-9*#+(),;N -]{1,32}$").matches(dialString)
        if (!isApprovedUssd && !isPhoneNumber) {
            call.reject("Unsupported dial string")
            return
        }

        val uri = Uri.parse("tel:" + Uri.encode(dialString))
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
                put("message", "Dial request handed to Android telephony.")
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

    private fun permissionCallback(call: PluginCall) {
        if (getPermissionState("phone") == com.getcapacitor.PermissionState.GRANTED) {
            dialUssd(call)
        } else {
            call.reject("CALL_PHONE permission was not granted")
        }
    }
}
