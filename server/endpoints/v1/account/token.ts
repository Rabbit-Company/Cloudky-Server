import { type MatchedRoute } from "bun";
import Redis from "../../../database/redis";
import Errors from "../../../errors";
import Utils from "../../../utils";
import Validate from "../../../validate";
import DB from "../../../database/database";
import Metrics from "../../../metrics";

export default async function handleAccountToken(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'POST') return Utils.jsonResponse(Errors.getJson(404));

	const auth = Utils.basicAuthentication(req);
	if(auth === null) return Utils.jsonResponse(Errors.getJson(1011));

	if(!Validate.username(auth.user)) return Utils.jsonResponse(Errors.getJson(1012));
	if(!Validate.password(auth.pass)) return Utils.jsonResponse(Errors.getJson(1013));

	let result = await DB.prepare('SELECT "Password" FROM "Accounts" WHERE "Username" = ?', [auth.user]);
	if(result === null) return Utils.jsonResponse(Errors.getJson(2000));
	if(result.length !== 1) return Utils.jsonResponse(Errors.getJson(1012));

	if(!(await Bun.password.verify(auth.pass, result[0].Password))) return Utils.jsonResponse(Errors.getJson(1014));

	let hashedIP = await Utils.generateHash(ip || '', 'sha256');
	let newToken = Utils.generateRandomText(128);
	let token = await Redis.getOrSetString(`token_${auth.user}_${hashedIP}`, newToken, 60, 3600);
	if(token === null) return Utils.jsonResponse(Errors.getJson(1015));

	if(Number(process.env.METRICS_TYPE) >= 2){
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, auth.user).inc();
	}

	let timestamp = Math.floor(Date.now() / 1000);
	await DB.prepare('UPDATE "Accounts" SET "Accessed" = ? WHERE "Username" = ?', [timestamp, auth.user]);

	let json = Errors.getJson(0) as { error: number; info: string; token?: string };
	json.token = token;

	return Utils.jsonResponse(json);
}