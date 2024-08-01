export default class Errors{

	static list: { [key: number]: string } = {
		404: 'Invalid API endpoint',
		1000: 'Bearer Token is missing in Authorization header.',
		1001: 'Not all required data provided in json format.',
		1002: 'Registration is disabled on this server.',
		1003: 'Username can only contain lowercase characters, numbers and hyphens. It also needs to start with lowercase character and be between 4 and 30 characters long.',
		1004: 'Password must be hashed using Blake2b algorithm.',
		1005: 'Provided file name can not contain special characters.',
		1006: 'Provided file is invalid.',
		1007: 'Username is already registered.',
		1008: 'Provided API Secret Key in Bearer Token is invalid.',
		1009: 'Provided email is invalid.',
		1010: 'Max file size is 50GB.',
		1011: 'Username and Password are missing in Authorization header.',
		1012: 'Provided username is invalid.',
		1013: 'Provided password is invalid.',
		1014: 'Password is incorrect.',
		1015: 'Redis connection error.',
		1016: 'Provided token is invalid.',
		1017: 'Provided token is incorrect or it has expired.',
		1018: 'Username and Token are missing in Authorization header.',
		1019: 'Provided account type in invalid.',
		1020: 'Provided uploadID needs to be UUIDv4',
		1021: 'Provided expiration timestamp is invalid.',
		1022: 'Share Link can not be created on non-existing file or folder.',
		1023: 'Provided share link is invalid.',
		2000: 'Something went wrong while trying to perform this action. Please try again later.',
		9999: 'Your do not have permission to perform this action.'
	};

	static get(id: number){
		return this.list[id];
	}

	static getJson(id: number){
		return { 'error': id, 'info': this.list[id] };
	}
}