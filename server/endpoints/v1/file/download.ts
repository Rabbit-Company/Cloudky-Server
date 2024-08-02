import type { MatchedRoute } from "bun";
import { basicAuthentication, generateHash, jsonError, jsonResponse } from "../../../utils";
import Validate from "../../../validate";
import Redis from "../../../database/redis";
import S3 from "../../../storage/s3storage";
import LocalStorage from "../../../storage/localstorage";
import Metrics from "../../../metrics";

export default async function handleFileDownload(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
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
	if(!Validate.userFilePathName(data.path)) return jsonError(1005);

	let hashedIP = await generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if(!Validate.token(token)) return jsonError(1017);
	if(auth.pass !== token) return jsonError(1017);

	if(Number(process.env.METRICS_TYPE) >= 3){
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, auth.user).inc();
	}

	if(process.env.S3_ENABLED === 'true'){
		let res = await S3.getUserObjectLink(auth.user, data.path);
		if(res === null) return jsonError(2000);
		return jsonResponse({ 'error': 0, 'info': 'Success', 'link': res });
	}

	let res = await LocalStorage.downloadUserFile(auth.user, data.path);
	if(res === null) return jsonError(2000);

	const parts = data.path.split('/');
	const fileName = parts[parts.length - 1];

	const response = new Response(res);
	response.headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
	return response;
}