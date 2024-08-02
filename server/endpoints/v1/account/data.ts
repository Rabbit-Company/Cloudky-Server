import type { MatchedRoute } from "bun";
import { basicAuthentication, generateHash, jsonError, jsonResponse } from "../../../utils";
import Validate from "../../../validate";
import Redis from "../../../database/redis";
import DB from "../../../database/database";
import Metrics from "../../../metrics";

export default async function handleAccountData(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'GET') return jsonError(404);

	const auth = basicAuthentication(req);
	if(auth === null) return jsonError(1018);

	if(!Validate.username(auth.user)) return jsonError(1012);
	if(!Validate.token(auth.pass)) return jsonError(1016);

	let hashedIP = await generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if(!Validate.token(token)) return jsonError(1017);
	if(auth.pass !== token) return jsonError(1017);

	if(Number(process.env.METRICS_TYPE) >= 3){
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, auth.user).inc();
	}

	let result: any = await DB.prepare(`SELECT "Email","StorageUsed","StorageLimit","DownloadUsed","DownloadLimit","UploadUsed","UploadLimit","Type" AS "AccountType","Created" FROM "Accounts" WHERE "Username" = ?`, [auth.user]);
	if(result === null || result.length !== 1) return jsonError(2000);

	result[0].StorageType = (process.env.S3_ENABLED === 'true') ? 'S3' : 'LOCAL';

	return jsonResponse({ 'error': 0, 'info': 'Success', 'data': result[0]});
}