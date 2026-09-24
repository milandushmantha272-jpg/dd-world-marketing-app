package com.ddworld.marketing.bridge

object UssdActivationRouting {
    const val GOVIMITHURU_CODE = "#616#"
    const val SAYURU_CODE = "#828#"

    enum class Transport {
        DIRECT_USSD_REQUEST,
        PHONE_CALL
    }

    fun transportFor(code: String): Transport {
        val normalized = code.trim()
        return if (normalized.startsWith("*") || normalized.startsWith("#")) {
            Transport.DIRECT_USSD_REQUEST
        } else {
            Transport.PHONE_CALL
        }
    }
}
