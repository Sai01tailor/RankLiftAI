// ══════════════════════════════════════════════
//  Standardized API Response
//  Ensures every response has a consistent format
// ══════════════════════════════════════════════

class ApiResponse {
    constructor(statusCode, message, data = null) {
        this.success = statusCode < 400;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }

    // Send the response
    send(res) {
        return res.status(this.statusCode).json({
            success: this.success,
            message: this.message,
            data: this.data
        });
    }

    // Static helpers
    static ok(res, message = "Success", data = null) {
        return new ApiResponse(200, message, data).send(res);
    }

    static created(res, message = "Created", data = null) {
        return new ApiResponse(201, message, data).send(res);
    }

    static noContent(res) {
        return res.status(204).end();
    }

    static paginated(res, message, data, pagination) {
        return res.status(200).json({
            success: true,
            message,
            data,
            pagination
        });
    }
}

module.exports = ApiResponse;
