namespace Validate {
	export function username(username: string | null | undefined): boolean {
		if (typeof username !== "string") return false;
		if (["null", "com1", "lpt1", "admin"].includes(username)) return false;
		if (username.includes("--")) return false;
		return /^([a-z][a-z0-9\-]{3,29})$/.test(username);
	}

	export function email(email: string | null | undefined): boolean {
		if (typeof email !== "string") return false;
		return /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email);
	}

	export function password(password: string | null | undefined): boolean {
		if (typeof password !== "string") return false;
		return /^([a-z0-9]{128})$/.test(password);
	}

	export function uuid(uuid: string | null | undefined): boolean {
		if (typeof uuid !== "string") return false;
		return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
	}

	export function token(token: string | null | undefined): boolean {
		if (typeof token !== "string") return false;
		return token.length === 128;
	}

	export function expiration(expiration: bigint | number | null | undefined): boolean {
		if (typeof expiration !== "bigint" && typeof expiration !== "number") return false;
		return Number(expiration) > Date.now();
	}

	export function sharelink(id: string | null | undefined): boolean {
		if (typeof id !== "string") return false;
		return /^([A-Za-z0-9]{15})$/.test(id);
	}

	export function userFilePathName(filePathName: string | null | undefined): boolean {
		if (typeof filePathName !== "string") return false;
		if (filePathName.includes("..")) return false;
		return /^[a-zA-Z0-9\/_. -]+$/.test(filePathName);
	}

	export function userFilePathNames(filePathNames: string[] | null | undefined): boolean {
		if (!Array.isArray(filePathNames)) return false;
		if (filePathNames.length === 0) return false;
		for (let i = 0; i < filePathNames.length; i++) {
			if (filePathNames[i].includes("..")) return false;
			if (!/^[a-zA-Z0-9\/_. -]+$/.test(filePathNames[i])) return false;
		}
		return true;
	}

	export function accountType(accountType: string | number | null | undefined): boolean {
		if (typeof accountType !== "string" && typeof accountType !== "number") return false;
		if (![0, 1].includes(Number(accountType))) return false;
		return true;
	}

	export function chunks(chunks: string[] | null | undefined): boolean {
		if (!Array.isArray(chunks)) return false;
		for (let i = 0; i < chunks.length; i++) {
			if (!Validate.token(chunks[i])) return false;
		}
		return true;
	}
}

export default Validate;
