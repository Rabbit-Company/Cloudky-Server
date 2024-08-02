import type { MatchedRoute } from "bun";
import { basicAuthentication, generateHash, jsonError, jsonResponse } from "../../../utils";
import Validate from "../../../validate";
import Redis from "../../../database/redis";
import Storage from "../../../storage/storage";
import Metrics from "../../../metrics";

export default async function handleFileDelete(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
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
	if(!Validate.userFilePathNames(data.paths)) return jsonError(1005);

	let hashedIP = await generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if(!Validate.token(token)) return jsonError(1017);
	if(auth.pass !== token) return jsonError(1017);

	if(Number(process.env.METRICS_TYPE) >= 3){
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, auth.user).inc();
	}

	let res = await Storage.deleteUserFiles(auth.user, data.paths);
	if(res === false) return jsonError(2000);

	await Redis.deleteString(`filelist_${auth.user}`);

	return jsonResponse({ 'error': 0, 'info': 'Success' });
}