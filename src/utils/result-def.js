class Result {
    // util
    constructor(success, data, error) {
        this.success = success;
        this.data = data;
        this.error = error;
    }
    toString() {
        return this.success ? this.data.toString() : this.error.message;
    }
}

class SuccessResult extends Result {
    // util
    constructor(data) {
        super(true, data);
    }
}

class UnsuccessResult extends Result {
    // util
    constructor(code, message, value) {
        super(false, undefined, {
            code,
            message,
            value
        });
    }
}

export {
    Result,
    SuccessResult,
    UnsuccessResult
};