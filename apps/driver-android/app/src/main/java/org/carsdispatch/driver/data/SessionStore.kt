package org.carsdispatch.driver.data

import android.content.Context
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class SessionStore(context: Context) {
    private val prefs = context.getSharedPreferences("cars_driver_session", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }

    fun load(): MobileSession? {
        val raw = prefs.getString(KEY_SESSION, null) ?: return null
        return runCatching { json.decodeFromString<MobileSession>(raw) }.getOrNull()
    }

    fun save(session: MobileSession) {
        prefs.edit().putString(KEY_SESSION, json.encodeToString(session)).apply()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_SESSION = "session"
    }
}
