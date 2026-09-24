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
    fun agentActivationCodesUseDirectUssdRequestRoute() {
        assertTrue(UssdActivationRouting.transportFor("#616#") == UssdActivationRouting.Transport.DIRECT_USSD_REQUEST)
        assertTrue(UssdActivationRouting.transportFor("#828#") == UssdActivationRouting.Transport.DIRECT_USSD_REQUEST)
        assertTrue(UssdActivationRouting.transportFor("*123#") == UssdActivationRouting.Transport.DIRECT_USSD_REQUEST)
    }
}
