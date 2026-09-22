package com.ddworld.marketing.bridge

import org.junit.Assert.assertEquals
import org.junit.Test

class NativeUssdBridgeTest {
    @Test
    fun fallbackUriEncodesHashCharacters() {
        val uri = NativeUssdBridge.buildUssdFallbackUri("#616#")
        assertEquals("tel:%23616%23", uri.toString())
    }

    @Test
    fun fallbackUriPreservesStarAndEncodesHash() {
        val uri = NativeUssdBridge.buildUssdFallbackUri("*123#")
        assertEquals("tel:*123%23", uri.toString())
    }
}
