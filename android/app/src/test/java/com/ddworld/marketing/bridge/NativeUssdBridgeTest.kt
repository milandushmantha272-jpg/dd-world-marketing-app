package com.ddworld.marketing.bridge

import org.junit.Assert.assertEquals
import org.junit.Test

class NativeUssdBridgeTest {
    @Test
    fun ussdCodesUseExpectedHashSyntax() {
        assertEquals(true, "#616#".startsWith("#") && "#616#".endsWith("#"))
        assertEquals(true, "#828#".startsWith("#") && "#828#".endsWith("#"))
    }

    @Test
    fun fallbackUriKeepsUssdCodeIntact() {
        val uri = NativeUssdBridge.ussdCallUri("#616#")
        assertEquals("tel", uri.scheme)
        assertEquals("#616#", uri.schemeSpecificPart)
    }
}
