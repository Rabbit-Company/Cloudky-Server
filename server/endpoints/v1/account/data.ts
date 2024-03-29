import type { MatchedRoute } from "bun";
import Errors from "../../../errors";
import Utils from "../../../utils";
import Validate from "../../../validate";
import Redis from "../../../database/redis";
import DB from "../../../database/database";
import Metrics from "../../../metrics";

export default async function handleAccountData(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'GET') return Utils.jsonResponse(Errors.getJson(404));

	const auth = Utils.basicAuthentication(req);
	if(auth === null) return Utils.jsonResponse(Errors.getJson(1018));

	if(!Validate.username(auth.user)) return Utils.jsonResponse(Errors.getJson(1012));
	if(!Validate.token(auth.pass)) return Utils.jsonResponse(Errors.getJson(1016));

	let hashedIP = await Utils.generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if(!Validate.token(token)) return Utils.jsonResponse(Errors.getJson(1017));
	if(auth.pass !== token) return Utils.jsonResponse(Errors.getJson(1017));

	if(Number(process.env.METRICS_TYPE) >= 3){
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, auth.user).inc();
	}

	let result: any = await DB.prepare(`SELECT "Email","StorageUsed","StorageLimit","DownloadUsed","DownloadLimit","UploadUsed","UploadLimit","Type" AS "AccountType","Created" FROM "Accounts" WHERE "Username" = ?`, [auth.user]);
	if(result === null || result.length !== 1) return Utils.jsonResponse(Errors.getJson(2000));

	result[0].StorageType = (process.env.S3_ENABLED === 'true') ? 'S3' : 'LOCAL';

	return Utils.jsonResponse({ 'error': 0, 'info': 'Success', 'data': result[0]});
}