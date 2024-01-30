import { type MatchedRoute } from "bun";
import Redis from "../../../database/redis";
import SQLite from "../../../database/sqlite";
import Errors from "../../../errors";
import Utils from "../../../utils";
import Validate from "../../../validate";

export default async function handleAccountToken(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'GET') return Utils.jsonResponse(Errors.getJson(404));

	const auth = Utils.basicAuthentication(req);
	if(auth === null) return Utils.jsonResponse(Errors.getJson(1011));

	if(!Validate.username(auth.user)) return Utils.jsonResponse(Errors.getJson(1012));
	if(!Validate.password(auth.pass)) return Utils.jsonResponse(Errors.getJson(1013));

	let result = SQLite.DB.prepare('SELECT "Password" FROM "Accounts" WHERE "Username" = ?').get(auth.user) as { password: string } | null | undefined;
	if(result === null) return Utils.jsonResponse(Errors.getJson(2000));
	if(!result) return Utils.jsonResponse(Errors.getJson(1012));

	if(!(await Bun.password.verify(auth.pass, result.password))) return Utils.jsonResponse(Errors.getJson(1014));

	let hashedIP = await Utils.generateHash(ip || '', 'sha256');
	let newToken = Utils.generateRandomText(128);
	let token = await Redis.getOrSetString(`token_${auth.user}_${hashedIP}`, newToken, 60, 3600);
	if(token === null) return Utils.jsonResponse(Errors.getJson(1015));

	let json = Errors.getJson(0) as { error: number; info: string; token?: string };
	json.token = token;

	return Utils.jsonResponse(json);
}