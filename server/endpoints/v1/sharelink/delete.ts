import type { MatchedRoute } from "bun";
import DB from "../../../database/database";
import { authenticateUser, jsonError, jsonResponse } from "../../../utils";
import Validate from "../../../validate";
import Metrics from "../../../metrics";

export default async function handleShareLinkDelete(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
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

	if(!Validate.sharelink(data.link)) return jsonError(1023);

	let result = await DB.prepareModify('DELETE FROM "ShareLinks" WHERE "Token" = ? AND "Username" = ?', [data.link, user]);
	if(!result) return jsonError(2000);

	return jsonResponse({ 'error': 0, 'info': 'Success' });
}