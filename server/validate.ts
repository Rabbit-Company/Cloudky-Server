export default class Validate{

	static username(username: string | null | undefined): boolean{
		if(typeof(username) !== 'string') return false;
		return /^([a-z][a-z0-9\-]{3,29})$/.test(username);
	}

	static email(email: string | null | undefined): boolean{
		if(typeof(email) !== 'string') return false;
		return /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email);
	}

	static password(password: string | null | undefined): boolean{
		if(typeof(password) !== 'string') return false;
		return /^([a-z0-9]{128})$/.test(password);
	}

	static uuid(uuid: string | null | undefined): boolean{
		if(typeof(uuid) !== 'string') return false;
		return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
	}

	static token(token: string | null | undefined): boolean{
		if(typeof(token) !== 'string') return false;
		return token.length === 128;
	}

	static userFilePathName(filePathName: string | null | undefined): boolean{
		if(typeof(filePathName) !== 'string') return false;
		if(filePathName.includes('..')) return false;
		return /^[a-zA-Z0-9\/_-]+$/.test(filePathName);
	}

}