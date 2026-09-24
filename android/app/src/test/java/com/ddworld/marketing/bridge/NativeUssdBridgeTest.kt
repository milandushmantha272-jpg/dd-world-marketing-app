package com.ddworld.marketing.bridge

import org.junit.Assert.assertTrue
import org.junit.Test

class NativeUssdBridgeTest {
    @Test
    fun dialogShortCodesUsePhoneCallRoute() {
        assertTrue(UssdActivationRouting.transportFor("616") == UssdActivationRouting.Transport.PHONE_CALL)
        assertTrue(UssdActivationRouting.transportFor("828") == UssdActivationRouting.Transport.PHONE_CALL)
    }

    @Test
    fun genericMmiCodesStillUseDirectUssdRequestRoute() {
        assertTrue(UssdActivationRouting.transportFor("*123#") == UssdActivationRouting.Transport.DIRECT_USSD_REQUEST)
        assertTrue(UssdActivationRouting.transportFor("#107#") == UssdActivationRouting.Transport.DIRECT_USSD_REQUEST)
        assertTrue(UssdActivationRouting.transportFor("0771234567") == UssdActivationRouting.Transport.PHONE_CALL)
    }
}
