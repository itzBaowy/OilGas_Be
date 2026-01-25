export function responseSuccess(data, message = "ok", statusCode = 200) {
    return {
        status: "success",
        statusCode: statusCode,
        message: message,
        data: data,
    };
}

export function responseError(message = "Interval Server Error", statusCode = 500) {
    return {
        status: "error",
        statusCode: statusCode,
        message: message,
    };
}
