import type { MatchedRoute } from "bun";
import DB from "../../../database/database";
import { authenticateUser, generateRandomText, jsonError, jsonResponse } from "../../../utils";
import Validate from "../../../validate";
import Metrics from "../../../metrics";
import LocalStorage from "../../../storage/localstorage";

export default async function handleShareLinkCreate(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'POST') return jsonError(404);

	let data: any;
	try{
		data = await req.json();
	}catch{
		return jsonError(1001);
	}

	const { user, error } = await authenticateUser(req, ip);
  if(error) return error;

	if(Number(process.env.METRICS_TYPE) >= 3){
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, user).inc();
	}

	if(!Validate.userFilePathName(data.path)) return jsonError(1005);
	if(data.password !== null && !Validate.password(data.password)) return jsonError(1004);
	if(data.expiration !== null && !Validate.expiration(data.expiration)) return jsonError(1021);

	if(!(await LocalStorage.userFileExists(user, data.path))) return jsonError(1022);

	const id = generateRandomText(15);

	let timestamp = Date.now();
	let result = await DB.prepareModify('INSERT INTO "ShareLinks"("Token","Path","Username","Password","Downloaded","Expiration","Created","Accessed") VALUES(?,?,?,?,?,?,?,?)', [id, data.path, user, data.password, 0, data.expiration, timestamp, timestamp]);
	if(!result) return jsonError(2000);

	return jsonResponse({ 'error': 0, 'info': 'Success' });
}