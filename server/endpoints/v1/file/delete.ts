import type { MatchedRoute } from "bun";
import Errors from "../../../errors";
import Utils from "../../../utils";
import Validate from "../../../validate";
import Redis from "../../../database/redis";
import Storage from "../../../storage/storage";
import Metrics from "../../../metrics";

export default async function handleFileDelete(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
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
	if(!Validate.userFilePathNames(data.paths)) return Utils.jsonResponse(Errors.getJson(1005));

	let hashedIP = await Utils.generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if(!Validate.token(token)) return Utils.jsonResponse(Errors.getJson(1017));
	if(auth.pass !== token) return Utils.jsonResponse(Errors.getJson(1017));

	if(Number(process.env.METRICS_TYPE) >= 3){
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, auth.user).inc();
	}

	let res = await Storage.deleteUserFiles(auth.user, data.paths);
	if(res === false) return Utils.jsonResponse(Errors.getJson(2000));

	await Redis.deleteString(`filelist_${auth.user}`);

	return Utils.jsonResponse({ 'error': 0, 'info': 'Success' });
}