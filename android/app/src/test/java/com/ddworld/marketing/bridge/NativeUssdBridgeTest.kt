package com.ddworld.marketing.bridge

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeUssdBridgeTest {
    @Test
    fun ussdCodesUseExpectedHashSyntax() {
        assertTrue("#616#".startsWith("#") && "#616#".endsWith("#"))
        assertTrue("#828#".startsWith("#") && "#828#".endsWith("#"))
    }

    @Test
    fun agentActivationCodesUseNativeTelephonyRoute() {
        assertTrue(UssdActivationRouting.shouldUseNativeTelephony("#616#"))
        assertTrue(UssdActivationRouting.shouldUseNativeTelephony("#828#"))
        assertFalse(UssdActivationRouting.shouldUseNativeTelephony("*123#"))
    }
}
