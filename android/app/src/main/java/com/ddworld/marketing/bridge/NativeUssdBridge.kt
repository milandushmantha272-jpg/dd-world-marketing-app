package com.ddworld.marketing.bridge

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.content.pm.PackageManager
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
        val code = call.getString("code") ?: ""
        if (code != "#616#" && code != "#828#") {
            call.reject("Unsupported USSD code")
            return
        }

        val uri = Uri.parse("tel:" + code)
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M &&
                activity.checkSelfPermission(Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionForAlias("phone", call, "permissionCallback")
                return
            }
            activity.startActivity(Intent(Intent.ACTION_CALL, uri))
            call.resolve(JSObject().apply {
                put("status", "STARTED")
                put("message", "USSD request handed to Android telephony.")
            })
        } catch (e: SecurityException) {
            call.reject("CALL_PHONE permission is required", e)
        } catch (e: Exception) {
            try {
                activity.startActivity(Intent(Intent.ACTION_DIAL, uri))
                call.resolve(JSObject().apply {
                    put("status", "DIALER_FALLBACK")
                    put("message", "Native dialer opened for the USSD code.")
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
