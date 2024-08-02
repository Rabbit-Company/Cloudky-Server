import type { MatchedRoute } from "bun";
import { basicAuthentication, generateHash, jsonError, jsonResponse } from "../../../utils";
import Validate from "../../../validate";
import Redis from "../../../database/redis";
import Storage from "../../../storage/storage";
import DB from "../../../database/database";
import Metrics from "../../../metrics";

export default async function handleFileList(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
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

	let fromCache = false;
	let result: any = await Redis.getString(`filelist_${auth.user}`, 60);
	if(result !== null){
		result = JSON.parse(result);
		fromCache = true;
	}

	if(result === null) result = await Storage.listUserFiles(auth.user);
	if(result === null) return jsonError(2000);

	if(!fromCache){
		let storageUsage = Math.floor(Storage.calculateStorageUsage(result));
		await Redis.setString(`filelist_${auth.user}`, JSON.stringify(result), 60, 300);
		await Redis.setString(`storageUsage_${auth.user}`, storageUsage.toString(), 60, 300);
		await DB.prepareModify('UPDATE "Accounts" SET "StorageUsed" = ? WHERE "Username" = ?', [storageUsage, auth.user]);
	}

	return jsonResponse({ 'error': 0, 'info': 'Success', 'data': result});
}