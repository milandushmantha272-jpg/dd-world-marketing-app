package com.ddworld.marketing.bridge

object UssdActivationRouting {
    enum class Transport {
        DIRECT_USSD_REQUEST,
        PHONE_CALL
    }

    fun transportFor(code: String): Transport {
        val normalized = code.trim()
        return if (Regex("^[*#][0-9*#]{1,30}#$").matches(normalized)) {
            Transport.DIRECT_USSD_REQUEST
        } else {
            Transport.PHONE_CALL
        }
    }
}
