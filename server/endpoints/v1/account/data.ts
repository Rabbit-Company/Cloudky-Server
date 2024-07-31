import type { MatchedRoute } from "bun";
import Utils from "../../../utils";
import Validate from "../../../validate";
import Redis from "../../../database/redis";
import DB from "../../../database/database";
import Metrics from "../../../metrics";

export default async function handleAccountData(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'GET') return Utils.jsonError(404);

	const auth = Utils.basicAuthentication(req);
	if(auth === null) return Utils.jsonError(1018);

	if(!Validate.username(auth.user)) return Utils.jsonError(1012);
	if(!Validate.token(auth.pass)) return Utils.jsonError(1016);

	let hashedIP = await Utils.generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if(!Validate.token(token)) return Utils.jsonError(1017);
	if(auth.pass !== token) return Utils.jsonError(1017);

	if(Number(process.env.METRICS_TYPE) >= 3){
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, auth.user).inc();
	}

	let result: any = await DB.prepare(`SELECT "Email","StorageUsed","StorageLimit","DownloadUsed","DownloadLimit","UploadUsed","UploadLimit","Type" AS "AccountType","Created" FROM "Accounts" WHERE "Username" = ?`, [auth.user]);
	if(result === null || result.length !== 1) return Utils.jsonError(2000);

	result[0].StorageType = (process.env.S3_ENABLED === 'true') ? 'S3' : 'LOCAL';

	return Utils.jsonResponse({ 'error': 0, 'info': 'Success', 'data': result[0]});
}