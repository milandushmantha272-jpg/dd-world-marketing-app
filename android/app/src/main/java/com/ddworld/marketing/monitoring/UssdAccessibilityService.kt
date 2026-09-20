package com.ddworld.marketing.monitoring

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.content.Intent

/**
 * Best-effort USSD flow monitor. Android requires the agent to enable this
 * service explicitly in Settings. It emits only event metadata; it never
 * treats an observed screen as Dialog QC verification.
 */
class UssdAccessibilityService : AccessibilityService() {
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return
        val intent = Intent(ACTION_USSD_EVENT).apply {
            setPackage(packageName)
            putExtra(EXTRA_PACKAGE_NAME, event.packageName?.toString().orEmpty())
            putExtra(EXTRA_EVENT_TYPE, event.eventType)
            putExtra(EXTRA_CLASS_NAME, event.className?.toString().orEmpty())
        }
        sendBroadcast(intent)
    }

    override fun onInterrupt() = Unit

    companion object {
        const val ACTION_USSD_EVENT = "com.ddworld.marketing.app.USSD_ACCESSIBILITY_EVENT"
        const val EXTRA_PACKAGE_NAME = "packageName"
        const val EXTRA_EVENT_TYPE = "eventType"
        const val EXTRA_CLASS_NAME = "className"
    }
}
