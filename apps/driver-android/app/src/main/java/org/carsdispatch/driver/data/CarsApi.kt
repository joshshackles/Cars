package org.carsdispatch.driver.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.KSerializer
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.carsdispatch.driver.BuildConfig

class CarsApi(private val tokenProvider: () -> String?) {
    private val client = OkHttpClient.Builder().build()
    private val json = Json { ignoreUnknownKeys = true }
    private val contentType = "application/json".toMediaType()

    suspend fun login(email: String, accessCode: String, deviceName: String): MobileSession {
        return post(
            "/api/mobile/auth/login",
            json.encodeToString(
                mapOf(
                    "email" to email,
                    "accessCode" to accessCode,
                    "deviceName" to deviceName
                )
            ),
            MobileSession.serializer()
        )
    }

    suspend fun logout() {
        postRaw("/api/mobile/auth/logout", "{}")
    }

    suspend fun manifest(date: String): ManifestResponse {
        return get("/api/mobile/driver/manifest?date=$date", ManifestResponse.serializer())
    }

    suspend fun acceptAssignment(assignmentId: String) {
        postRaw("/api/mobile/assignments/$assignmentId/accept", "{}")
    }

    suspend fun declineAssignment(assignmentId: String, reason: String) {
        postRaw("/api/mobile/assignments/$assignmentId/decline", json.encodeToString(mapOf("reason" to reason)))
    }

    suspend fun startAssignment(assignmentId: String, location: LocationPayload, routeUrl: String) {
        postLocationAction(assignmentId, "start", location, routeUrl)
    }

    suspend fun sendLocation(assignmentId: String, location: LocationPayload) {
        postLocationAction(assignmentId, "location", location, null)
    }

    suspend fun arrived(assignmentId: String, location: LocationPayload) {
        postLocationAction(assignmentId, "arrived", location, null)
    }

    suspend fun completeAssignment(assignmentId: String, location: LocationPayload, routeUrl: String) {
        postLocationAction(assignmentId, "complete", location, routeUrl)
    }

    suspend fun reportIssue(assignmentId: String, summary: String, details: String) {
        postRaw(
            "/api/mobile/assignments/$assignmentId/report-issue",
            json.encodeToString(mapOf("summary" to summary, "details" to details))
        )
    }

    private suspend fun postLocationAction(
        assignmentId: String,
        action: String,
        location: LocationPayload,
        routeUrl: String?
    ) {
        val fields = mutableMapOf<String, JsonElement>(
            "location" to json.encodeToJsonElement(LocationPayload.serializer(), location)
        )
        routeUrl?.let { fields["routeUrl"] = JsonPrimitive(it) }
        postRaw("/api/mobile/assignments/$assignmentId/$action", JsonObject(fields).toString())
    }

    private suspend fun <T> get(path: String, serializer: KSerializer<T>): T = request(path, "GET", null, serializer)

    private suspend fun <T> post(path: String, body: String, serializer: KSerializer<T>): T =
        request(path, "POST", body, serializer)

    private suspend fun postRaw(path: String, body: String) {
        request<JsonObject>(path, "POST", body, JsonObject.serializer())
    }

    private suspend fun <T> request(path: String, method: String, body: String?, serializer: KSerializer<T>): T {
        val envelope = withContext(Dispatchers.IO) {
            val builder = Request.Builder()
                .url("${BuildConfig.CARS_API_BASE_URL}$path")
                .header("Content-Type", "application/json")

            tokenProvider()?.let { builder.header("Authorization", "Bearer $it") }

            val request = if (method == "POST") {
                builder.post((body ?: "{}").toRequestBody(contentType)).build()
            } else {
                builder.get().build()
            }

            client.newCall(request).execute().use { response ->
                val responseBody = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    throw IllegalStateException("CARS Dispatch returned ${response.code}.")
                }
                json.parseToJsonElement(responseBody).jsonObject
            }
        }

        val ok = envelope["ok"]?.jsonPrimitive?.booleanOrNull == true
        if (!ok) {
            throw IllegalStateException(envelope["error"]?.jsonPrimitive?.contentOrNull ?: "Request failed.")
        }

        val data = envelope["data"] ?: return json.decodeFromString(serializer, "{}")
        return json.decodeFromJsonElement(serializer, data)
    }
}
