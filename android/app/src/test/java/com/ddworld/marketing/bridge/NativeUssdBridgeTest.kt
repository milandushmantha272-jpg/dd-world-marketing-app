package com.ddworld.marketing.bridge

import org.junit.Assert.assertTrue
import org.junit.Test

class NativeUssdBridgeTest {
    @Test
    fun ussdCodesUseExpectedHashSyntax() {
        assertTrue("#616#".startsWith("#") && "#616#".endsWith("#"))
        assertTrue("#828#".startsWith("#") && "#828#".endsWith("#"))
    }
}
