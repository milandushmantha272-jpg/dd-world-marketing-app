package com.ddworld.marketing.bridge

import org.junit.Assert.assertEquals
import org.junit.Test

class NativeUssdBridgeTest {
    @Test
    fun fallbackUriEncodesHashCharacters() {
        assertEquals("%23616%23", NativeUssdBridge.encodeUssdForTelUri("#616#"))
    }

    @Test
    fun fallbackUriPreservesStarAndEncodesHash() {
        assertEquals("*123%23", NativeUssdBridge.encodeUssdForTelUri("*123#"))
    }
}
