import { type SupportedCryptoAlgorithms } from "bun";
import Errors from "./errors";

export enum PERMISSIONS {
	CREATE_SHARE_LINKS = 0x00000001,
	EMAIL_SHARE_LINKS = 0x00000002,
};

export default class Utils{

	static hasPermission(userPermissions: number, targetPermission: PERMISSIONS) : boolean {
		return (userPermissions & targetPermission) === targetPermission;
	}

	static grantPermission(userPermissions: number, targetPermission: PERMISSIONS) : number{
		return (userPermissions |= targetPermission);
	}

	static revokePermission(userPermissions: number, targetPermission: PERMISSIONS) : number{
		return (userPermissions &= ~targetPermission);
	}

	static jsonResponse(json: object, statusCode = 200){
		return new Response(JSON.stringify(json), {
			headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
			status: statusCode
		});
	}

	static jsonError(error: number, statusCode = 200){
		return new Response(JSON.stringify(Errors.getJson(error)), {
			headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
			status: statusCode
		});
	}

	static async generateHash(message: string, algorithm: SupportedCryptoAlgorithms){
		const hasher = new Bun.CryptoHasher(algorithm);
		hasher.update(message);
		return hasher.digest("hex");
	}

	static getBearerToken(req: Request) : string | null{
		const authHeader = req.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
		return authHeader.split(' ')[1];
	}

	static basicAuthentication(req: Request): { user: string, pass: string } | null {
		const Authorization = req.headers.get('Authorization') || "";
		const [scheme, encoded] = Authorization.split(' ');
		if (!encoded || scheme !== 'Basic') return null;
		const buffer = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
		const decoded = new TextDecoder().decode(buffer).normalize();

		const index = decoded.indexOf(':');
		if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) return null;

		return { user: decoded.substring(0, index), pass: decoded.substring(index + 1) };
	}

	static generateRandomText(length: number) : string {
		const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const keyArray = new Uint8Array(length);
		(crypto as any).getRandomValues(keyArray);

		let apiKey = '';
		for (let i = 0; i < keyArray.length; i++) {
			const index = keyArray[i] % charset.length;
			apiKey += charset[index];
		}

		return apiKey;
	}

}