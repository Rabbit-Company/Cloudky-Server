import type { MatchedRoute } from "bun";
import DB from "../../../database/database";
import Redis from "../../../database/redis";
import Errors from "../../../errors";
import Utils from "../../../utils";
import Validate from "../../../validate";

export default async function handleShareLinkDelete(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'POST') return Utils.jsonResponse(Errors.getJson(404));

	let data: any;
	try{
		data = await req.json();
	}catch{
		return Utils.jsonResponse(Errors.getJson(1001));
	}

	const auth = Utils.basicAuthentication(req);
	if(auth === null) return Utils.jsonResponse(Errors.getJson(1018));

	if(!Validate.username(auth.user)) return Utils.jsonResponse(Errors.getJson(1012));
	if(!Validate.token(auth.pass)) return Utils.jsonResponse(Errors.getJson(1016));

	let hashedIP = await Utils.generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if(!Validate.token(token)) return Utils.jsonResponse(Errors.getJson(1017));
	if(auth.pass !== token) return Utils.jsonResponse(Errors.getJson(1017));

	if(!Validate.sharelink(data.link)) return Utils.jsonResponse(Errors.getJson(1023));

	let result = await DB.prepareModify('DELETE FROM "ShareLinks" WHERE "Token" = ? AND "Username" = ?', [data.link, auth.user]);
	if(!result) return Utils.jsonResponse(Errors.getJson(2000));

	return Utils.jsonResponse(Errors.getJson(0));
}