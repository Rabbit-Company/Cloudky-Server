import type { MatchedRoute } from "bun";
import DB from "../../../database/database";
import Redis from "../../../database/redis";
import { basicAuthentication, generateHash, generateRandomText, jsonError, jsonResponse } from "../../../utils";
import Validate from "../../../validate";

export default async function handleShareLinkCreate(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
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

	if(!Validate.userFilePathName(data.path)) return jsonError(1005);
	if(data.password !== null && !Validate.password(data.password)) return jsonError(1004);
	if(data.expiration !== null && !Validate.expiration(data.expiration)) return jsonError(1021);

	let results = await DB.prepare('SELECT * FROM "Files" WHERE "Username" = ? AND "Path" = ?', [auth.user,data.path]);
	if(results === null || results.length === 0) return jsonError(1022);

	const id = generateRandomText(15);

	let timestamp = Date.now();
	let result = await DB.prepareModify('INSERT INTO "ShareLinks"("Token","Path","Username","Password","Downloaded","Expiration","Created","Accessed") VALUES(?,?,?,?,?,?,?,?)', [id, data.path, auth.user, data.password, 0, data.expiration, timestamp, timestamp]);
	if(!result) return jsonError(2000);

	return jsonResponse({ 'error': 0, 'info': 'Success' });
}