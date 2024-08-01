import type { MatchedRoute } from "bun";
import DB from "../../../database/database";
import Redis from "../../../database/redis";
import Utils from "../../../utils";
import Validate from "../../../validate";

export default async function handleShareLinkCreate(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'POST') return Utils.jsonError(404);

	let data: any;
	try{
		data = await req.json();
	}catch{
		return Utils.jsonError(1001);
	}

	const auth = Utils.basicAuthentication(req);
	if(auth === null) return Utils.jsonError(1018);

	if(!Validate.username(auth.user)) return Utils.jsonError(1012);
	if(!Validate.token(auth.pass)) return Utils.jsonError(1016);

	let hashedIP = await Utils.generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if(!Validate.token(token)) return Utils.jsonError(1017);
	if(auth.pass !== token) return Utils.jsonError(1017);

	if(!Validate.userFilePathName(data.path)) return Utils.jsonError(1005);
	if(data.password !== null && !Validate.password(data.password)) return Utils.jsonError(1004);
	if(data.expiration !== null && !Validate.expiration(data.expiration)) return Utils.jsonError(1021);

	let results = await DB.prepare('SELECT * FROM "Files" WHERE "Username" = ? AND "Path" = ?', [auth.user,data.path]);
	if(results === null || results.length === 0) return Utils.jsonError(1022);

	const id = Utils.generateRandomText(15);

	let timestamp = Date.now();
	let result = await DB.prepareModify('INSERT INTO "ShareLinks"("Token","Path","Username","Password","Downloaded","Expiration","Created","Accessed") VALUES(?,?,?,?,?,?,?,?)', [id, data.path, auth.user, data.password, 0, data.expiration, timestamp, timestamp]);
	if(!result) return Utils.jsonError(2000);

	return Utils.jsonResponse({ 'error': 0, 'info': 'Success' });
}