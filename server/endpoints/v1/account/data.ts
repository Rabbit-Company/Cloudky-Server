import type { MatchedRoute } from "bun";
import { authenticateUser, jsonError, jsonResponse } from "../../../utils";
import DB from "../../../database/database";
import Metrics from "../../../metrics";

export default async function handleAccountData(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if (req.method !== "GET") return jsonError(404);

	const { user, error } = await authenticateUser(req, ip);
	if (error) return error;

	if (Number(process.env.METRICS_TYPE) >= 3) {
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, user).inc();
	}

	let result: any = await DB.prepare(
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
	if (result === null || result.length !== 1) return jsonError(2000);

	result[0].StorageType = process.env.S3_ENABLED === "true" ? "S3" : "LOCAL";

	return jsonResponse({ error: 0, info: "Success", data: result[0] });
}
