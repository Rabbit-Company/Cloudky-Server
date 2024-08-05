import { type SupportedCryptoAlgorithms } from "bun";
import Errors from "./errors";
import Validate from "./validate";
import Redis from "./database/redis";

export const enum PERMISSIONS {
	CREATE_SHARE_LINKS = 0x00000001,
	EMAIL_SHARE_LINKS = 0x00000002,
};

export function hasPermission(userPermissions: number, targetPermission: PERMISSIONS) : boolean {
	return (userPermissions & targetPermission) === targetPermission;
}

export function grantPermission(userPermissions: number, targetPermission: PERMISSIONS) : number{
	return (userPermissions |= targetPermission);
}

export function revokePermission(userPermissions: number, targetPermission: PERMISSIONS) : number{
	return (userPermissions &= ~targetPermission);
}

export function jsonResponse(json: object, statusCode = 200){
	return new Response(JSON.stringify(json), {
		headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
		status: statusCode
	});
}

export function jsonError(error: number){
	return new Response(JSON.stringify(Errors.getJson(error)), {
		headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
		status: Errors.get(error).httpCode,
		statusText: Errors.get(error).message
	});
}

export async function generateHash(message: string, algorithm: SupportedCryptoAlgorithms){
	const hasher = new Bun.CryptoHasher(algorithm);
	hasher.update(message);
	return hasher.digest("hex");
}

export function getBearerToken(req: Request) : string | null{
	const authHeader = req.headers.get('authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
	return authHeader.split(' ')[1];
}

export function basicAuthentication(req: Request): { user: string, pass: string } | null {
	const Authorization = req.headers.get('Authorization') || "";
	const [scheme, encoded] = Authorization.split(' ');
	if (!encoded || scheme !== 'Basic') return null;
	const buffer = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
	const decoded = new TextDecoder().decode(buffer).normalize();

	const index = decoded.indexOf(':');
	if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) return null;

	return { user: decoded.substring(0, index), pass: decoded.substring(index + 1) };
}

export function generateRandomText(length: number) : string {
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

export async function authenticateUser(req: Request, ip: string | undefined): Promise<{ user: string, error: Response | null }> {
	const auth = basicAuthentication(req);
	if (auth === null) return { user: '', error: jsonError(1018) };

	if (!Validate.username(auth.user)) return { user: '', error: jsonError(1012) };
	if (!Validate.token(auth.pass)) return { user: '', error: jsonError(1016) };

	let hashedIP = await generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if (!Validate.token(token)) return { user: '', error: jsonError(1017) };
	if (auth.pass !== token) return { user: '', error: jsonError(1017) };

	return { user: auth.user, error: null };
}