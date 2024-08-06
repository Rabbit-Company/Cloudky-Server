import type { MatchedRoute } from "bun";
import DB from "../../../database/database";
import { authenticateUser, jsonError, jsonResponse } from "../../../utils";
import Metrics from "../../../metrics";
import { Error } from "../../../errors";

export default async function handleShareLinkList(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if (req.method !== "GET") return jsonError(Error.INVALID_ENDPOINT);

	const { user, error } = await authenticateUser(req, ip);
	if (error) return error;

	if (Number(process.env.METRICS_TYPE) >= 3) {
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, user).inc();
	}

	let results = await DB.prepare(
		`
		SELECT
			"Token",
			"Path",
			"Password",
			"Downloaded",
			"Expiration",
			"Created",
			"Accessed"
		FROM "ShareLinks"
		WHERE "Username" = ?
		`,
		[user]
	);
	if (!results) return jsonError(Error.UNKNOWN_ERROR);

	return jsonResponse({ error: 0, info: "Success", links: results });
}
