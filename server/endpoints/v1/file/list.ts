import type { MatchedRoute } from "bun";
import Errors from "../../../errors";
import Utils from "../../../utils";
import Validate from "../../../validate";
import Redis from "../../../database/redis";
import Storage from "../../../storage/storage";

export default async function handleFileList(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'GET') return Utils.jsonResponse(Errors.getJson(404));

	const auth = Utils.basicAuthentication(req);
	if(auth === null) return Utils.jsonResponse(Errors.getJson(1018));

	if(!Validate.username(auth.user)) return Utils.jsonResponse(Errors.getJson(1012));
	if(!Validate.token(auth.pass)) return Utils.jsonResponse(Errors.getJson(1016));

	let hashedIP = await Utils.generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if(!Validate.token(token)) return Utils.jsonResponse(Errors.getJson(1017));
	if(auth.pass !== token) return Utils.jsonResponse(Errors.getJson(1017));

	let fromCache = false;
	let result: any = await Redis.getString(`filelist_${auth.user}`, 10);
	if(result !== null){
		result = JSON.parse(result);
		fromCache = true;
	}

	if(result === null) result = await Storage.listUserFiles(auth.user);
	if(result === null) return Utils.jsonResponse(Errors.getJson(2000));

	if(!fromCache) await Redis.setString(`filelist_${auth.user}`, JSON.stringify(result), 10, 10);

	return Utils.jsonResponse({ 'error': 0, 'info': 'Success', 'data': result});
}