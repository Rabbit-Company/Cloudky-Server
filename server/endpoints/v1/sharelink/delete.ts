import type { MatchedRoute } from "bun";
import DB from "../../../database/database";
import { authenticateUser, jsonError } from "../../../utils";
import Validate from "../../../validate";
import Metrics from "../../../metrics";
import { Error } from "../../../errors";

export default async function handleShareLinkDelete(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if (req.method !== "DELETE") return jsonError(Error.INVALID_ENDPOINT);

	let data: any;
	try {
		data = await req.json();
	} catch {
		return jsonError(Error.REQUIRED_DATA_MISSING);
	}

	const { user, error } = await authenticateUser(req, ip);
	if (error) return error;

	if (Number(process.env.METRICS_TYPE) >= 3) {
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, user).inc();
	}

	if (!Validate.sharelink(data.link)) return jsonError(Error.INVALID_SHARE_LINK);

	const result = await DB.prepareModify('DELETE FROM "ShareLinks" WHERE "Token" = ? AND "Username" = ?', [data.link, user]);
	if (!result) return jsonError(Error.UNKNOWN_ERROR);

	return jsonError(Error.SUCCESS);
}
