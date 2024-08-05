export default class Errors{

	static list: { [key: number]: { message: string, httpCode: number } } = {
		404: { message: 'Invalid API endpoint', httpCode: 404 },
		1000: { message: 'Bearer Token is missing in Authorization header.', httpCode: 401 },
		1001: { message: 'Not all required data provided in json format.', httpCode: 400 },
		1002: { message: 'Registration is disabled on this server.', httpCode: 403 },
		1003: { message: 'Username can only contain lowercase characters, numbers and hyphens. It also needs to start with lowercase character and be between 4 and 30 characters long.', httpCode: 400 },
		1004: { message: 'Password must be hashed using Blake2b algorithm.', httpCode: 400 },
		1005: { message: 'Provided file name can not contain special characters.', httpCode: 400 },
		1006: { message: 'Provided file is invalid.', httpCode: 400 },
		1007: { message: 'Username is already registered.', httpCode: 409 },
		1008: { message: 'Provided API Secret Key in Bearer Token is invalid.', httpCode: 401 },
		1009: { message: 'Provided email is invalid.', httpCode: 400 },
		1010: { message: 'Max file size is 50GB.', httpCode: 413 },
		1011: { message: 'Username and Password are missing in Authorization header.', httpCode: 401 },
		1012: { message: 'Provided username is invalid.', httpCode: 400 },
		1013: { message: 'Provided password is invalid.', httpCode: 400 },
		1014: { message: 'Password is incorrect.', httpCode: 401 },
		1015: { message: 'Redis connection error.', httpCode: 500 },
		1016: { message: 'Provided token is invalid.', httpCode: 401 },
		1017: { message: 'Provided token is incorrect or it has expired.', httpCode: 401 },
		1018: { message: 'Username and Token are missing in Authorization header.', httpCode: 401 },
		1019: { message: 'Provided account type in invalid.', httpCode: 400 },
		1020: { message: 'Provided uploadID needs to be UUIDv4', httpCode: 400 },
		1021: { message: 'Provided expiration timestamp is invalid.', httpCode: 400 },
		1022: { message: 'Share Link can not be created on non-existing file or folder.', httpCode: 400 },
		1023: { message: 'Provided share link is invalid.', httpCode: 400 },
		2000: { message: 'Something went wrong while trying to perform this action. Please try again later.', httpCode: 500 },
		9999: { message: 'Your do not have permission to perform this action.', httpCode: 403 }
	};

	static get(id: number){
		return this.list[id];
	}

	static getJson(id: number){
		return { 'error': id, 'info': this.list[id].message };
	}
}