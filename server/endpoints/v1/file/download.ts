import type { MatchedRoute } from "bun";
import Errors from "../../../errors";
import Utils from "../../../utils";
import Validate from "../../../validate";
import Redis from "../../../database/redis";
import S3 from "../../../storage/s3storage";
import LocalStorage from "../../../storage/localstorage";
import Metrics from "../../../metrics";

export default async function handleFileDownload(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'POST') return Utils.jsonResponse(Errors.getJson(404));

	let data: any;
	try{
		data = await req.json();
	}catch{
		return Utils.jsonResponse(Errors.getJson(1001));
	}

	const auth = Utils.basicAuthentication(req);
	if(auth === null) return Utils.jsonResponse(Errors.getJson(1018));

	if(!Validate.username(auth.user)) return Utils.jsonResponse(Errors.getJson(1012));
	if(!Validate.token(auth.pass)) return Utils.jsonResponse(Errors.getJson(1016));
	if(!Validate.userFilePathName(data.path)) return Utils.jsonResponse(Errors.getJson(1005));

	let hashedIP = await Utils.generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if(!Validate.token(token)) return Utils.jsonResponse(Errors.getJson(1017));
	if(auth.pass !== token) return Utils.jsonResponse(Errors.getJson(1017));

	if(Number(process.env.METRICS_TYPE) >= 2){
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, auth.user).inc();
	}

	if(process.env.S3_ENABLED === 'true'){
		let res = await S3.getUserObjectLink(auth.user, data.path);
		if(res === null) return Utils.jsonResponse(Errors.getJson(2000));
		return Utils.jsonResponse({ 'error': 0, 'info': 'Success', 'link': res });
	}

	let res = await LocalStorage.downloadUserFile(auth.user, data.path);
	if(res === null) return Utils.jsonResponse(Errors.getJson(2000));

	return new Response(res);
}