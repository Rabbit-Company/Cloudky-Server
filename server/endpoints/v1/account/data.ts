import type { MatchedRoute } from "bun";
import { authenticateUser, jsonError, jsonResponse } from "../../../utils";
import DB from "../../../database/database";
import Metrics from "../../../metrics";
import { Error } from "../../../errors";

export default async function handleAccountData(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if (req.method !== "GET") return jsonError(Error.INVALID_ENDPOINT);

	const { user, error } = await authenticateUser(req, ip);
	if (error) return error;

	if (Number(process.env.METRICS_TYPE) >= 3) {
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, user).inc();
	}

	const result: any = await DB.prepare(
		`
		SELECT
			"Email",
			"StorageUsed",
			"StorageLimit",
			"DownloadUsed",
			"DownloadLimit",
			"UploadUsed",
			"UploadLimit",
			"Type" AS "AccountType",
			"Created"
		FROM "Accounts"
		WHERE "Username" = ?
		`,
		[user]
	);
	if (result === null || result.length !== 1) return jsonError(Error.UNKNOWN_ERROR);

	result[0].StorageType = process.env.S3_ENABLED === "true" ? "S3" : "LOCAL";

	return jsonResponse({ error: 0, info: "Success", data: result[0] });
}
