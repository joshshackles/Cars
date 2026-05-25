package org.carsdispatch.driver.data

data class DriverSupportRequest(
    val type: String,
    val summary: String,
    val details: String? = null,
    val assignmentId: String? = null,
    val priority: String = "normal"
)

data class DriverSupportResult(
    val submitted: Boolean,
    val message: String
)

class DriverSupportService(private val api: CarsApi) {
    suspend fun submit(request: DriverSupportRequest): DriverSupportResult {
        if (!request.assignmentId.isNullOrBlank()) {
            api.reportIssue(
                request.assignmentId,
                request.summary,
                request.details ?: "Driver requested dispatch help: ${request.type}"
            )
            return DriverSupportResult(true, "Dispatch has been notified.")
        }

        // TODO: Connect this to a dedicated mobile dispatch-support endpoint when
        // the backend model for general driver support requests is finalized.
        return DriverSupportResult(
            submitted = true,
            message = "Support request prepared locally. Call CARS for urgent dispatch help."
        )
    }
}
