import { type MatchedRoute } from "bun";
import Redis from "../../../database/redis";
import Errors from "../../../errors";
import { basicAuthentication, generateHash, generateRandomText, jsonError, jsonResponse } from "../../../utils";
import Validate from "../../../validate";
import DB from "../../../database/database";
import Metrics from "../../../metrics";

export default async function handleAccountToken(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'POST') return jsonError(404);

	const auth = basicAuthentication(req);
	if(auth === null) return jsonError(1011);

	if(!Validate.username(auth.user)) return jsonError(1012);
	if(!Validate.password(auth.pass)) return jsonError(1013);

	let result = await DB.prepare('SELECT "Password" FROM "Accounts" WHERE "Username" = ?', [auth.user]);
	if(result === null) return jsonError(2000);
	if(result.length !== 1) return jsonError(1012);

	if(!(await Bun.password.verify(auth.pass, result[0].Password))) return jsonError(1014);

	let hashedIP = await generateHash(ip || '', 'sha256');
	let newToken = generateRandomText(128);
	let token = await Redis.getOrSetString(`token_${auth.user}_${hashedIP}`, newToken, 60, 3600);
	if(token === null) return jsonError(1015);

	if(Number(process.env.METRICS_TYPE) >= 3){
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, auth.user).inc();
	}

	let timestamp = Date.now();
	await DB.prepare('UPDATE "Accounts" SET "Accessed" = ? WHERE "Username" = ?', [timestamp, auth.user]);

	let json = Errors.getJson(0) as { error: number; info: string; token?: string };
	json.token = token;

	return jsonResponse(json);
}