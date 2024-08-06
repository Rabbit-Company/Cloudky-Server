import type { MatchedRoute } from "bun";
import { authenticateUser, jsonError, jsonResponse } from "../../../utils";
import Redis from "../../../database/redis";
import Storage from "../../../storage/storage";
import Metrics from "../../../metrics";
import { Error } from "../../../errors";

export default async function handleFileDelete(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if (req.method !== "POST") return jsonError(Error.INVALID_ENDPOINT);

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

	let res = await Storage.deleteUserFiles(user, data.paths);
	if (res === false) return jsonError(Error.UNKNOWN_ERROR);

	await Redis.deleteString(`filelist_${user}`);

	return jsonResponse({ error: 0, info: "Success" });
}
