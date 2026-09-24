package com.ddworld.marketing.bridge

object UssdActivationRouting {
    const val GOVIMITHURU_CODE = "#616#"
    const val SAYURU_CODE = "#828#"

    fun shouldUseNativeTelephony(code: String): Boolean {
        val normalized = code.trim()
        return normalized == GOVIMITHURU_CODE || normalized == SAYURU_CODE
    }
}
