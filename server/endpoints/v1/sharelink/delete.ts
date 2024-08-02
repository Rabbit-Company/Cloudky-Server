import type { MatchedRoute } from "bun";
import DB from "../../../database/database";
import Redis from "../../../database/redis";
import { basicAuthentication, generateHash, jsonError, jsonResponse } from "../../../utils";
import Validate from "../../../validate";

export default async function handleShareLinkDelete(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'POST') return jsonError(404);

	let data: any;
	try{
		data = await req.json();
	}catch{
		return jsonError(1001);
	}

	const auth = basicAuthentication(req);
	if(auth === null) return jsonError(1018);

	if(!Validate.username(auth.user)) return jsonError(1012);
	if(!Validate.token(auth.pass)) return jsonError(1016);

	let hashedIP = await generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if(!Validate.token(token)) return jsonError(1017);
	if(auth.pass !== token) return jsonError(1017);

	if(!Validate.sharelink(data.link)) return jsonError(1023);

	let result = await DB.prepareModify('DELETE FROM "ShareLinks" WHERE "Token" = ? AND "Username" = ?', [data.link, auth.user]);
	if(!result) return jsonError(2000);

	return jsonResponse({ 'error': 0, 'info': 'Success' });
}