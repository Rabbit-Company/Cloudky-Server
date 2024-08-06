export enum Error {
	INVALID_ENDPOINT = 404,
	BEARER_TOKEN_MISSING = 1000,
	REQUIRED_DATA_MISSING = 1001,
	REGISTRATION_DISABLED = 1002,
	INVALID_USERNAME_FORMAT = 1003,
	PASSWORD_NOT_HASHED = 1004,
	INVALID_FILE_NAME = 1005,
	INVALID_FILE = 1006,
	USERNAME_ALREADY_REGISTERED = 1007,
	INVALID_API_SECRET_KEY = 1008,
	INVALID_EMAIL = 1009,
	MAX_FILE_SIZE_EXCEEDED = 1010,
	MISSING_AUTHORIZATION_HEADER = 1011,
	INVALID_USERNAME = 1012,
	INVALID_PASSWORD = 1013,
	INCORRECT_PASSWORD = 1014,
	REDIS_CONNECTION_ERROR = 1015,
	INVALID_TOKEN = 1016,
	TOKEN_EXPIRED = 1017,
	MISSING_USERNAME_AND_TOKEN = 1018,
	INVALID_ACCOUNT_TYPE = 1019,
	INVALID_UPLOAD_ID = 1020,
	INVALID_EXPIRATION_TIMESTAMP = 1021,
	NON_EXISTENT_SHARE_LINK = 1022,
	INVALID_SHARE_LINK = 1023,
	UNKNOWN_ERROR = 2000,
	INSUFFICIENT_PERMISSIONS = 9999,
}

namespace Errors {
	export const list: { [key: number]: { message: string; httpCode: number } } = {
		404: { message: "Invalid API endpoint", httpCode: 404 },
		1000: { message: "Bearer Token is missing in Authorization header.", httpCode: 401 },
		1001: { message: "Not all required data provided in json format.", httpCode: 400 },
		1002: { message: "Registration is disabled on this server.", httpCode: 403 },
		1003: { message: "The username must be 4 to 30 characters long and contain only lowercase letters, numbers, and hyphens.", httpCode: 400 },
		1004: { message: "Password must be hashed using Blake2b algorithm.", httpCode: 400 },
		1005: { message: "Provided file name can not contain special characters.", httpCode: 400 },
		1006: { message: "Provided file is invalid.", httpCode: 400 },
		1007: { message: "Username is already registered.", httpCode: 409 },
		1008: { message: "Provided API Secret Key in Bearer Token is invalid.", httpCode: 401 },
		1009: { message: "Provided email is invalid.", httpCode: 400 },
		1010: { message: "Max file size is 50GB.", httpCode: 413 },
		1011: { message: "Username and Password are missing in Authorization header.", httpCode: 401 },
		1012: { message: "Provided username is invalid.", httpCode: 400 },
		1013: { message: "Provided password is invalid.", httpCode: 400 },
		1014: { message: "Password is incorrect.", httpCode: 401 },
		1015: { message: "Redis connection error.", httpCode: 500 },
		1016: { message: "Provided token is invalid.", httpCode: 401 },
		1017: { message: "Provided token is incorrect or it has expired.", httpCode: 401 },
		1018: { message: "Username and Token are missing in Authorization header.", httpCode: 401 },
		1019: { message: "Provided account type in invalid.", httpCode: 400 },
		1020: { message: "Provided uploadID needs to be UUIDv4", httpCode: 400 },
		1021: { message: "Provided expiration timestamp is invalid.", httpCode: 400 },
		1022: { message: "Share Link can not be created on non-existing file or folder.", httpCode: 400 },
		1023: { message: "Provided share link is invalid.", httpCode: 400 },
		2000: { message: "Something went wrong while trying to perform this action. Please try again later.", httpCode: 500 },
		9999: { message: "Your do not have permission to perform this action.", httpCode: 403 },
	};

	export function get(id: Error) {
		return list[id];
	}

	export function getJson(id: Error) {
		return { error: id, info: list[id].message };
	}
}

export default Errors;
