import type { MatchedRoute } from "bun";
import { authenticateUser, jsonError, jsonResponse } from "../../../utils";
import Redis from "../../../database/redis";
import Storage from "../../../storage/storage";
import Metrics from "../../../metrics";
import Validate from "../../../validate";

export default async function handleFileRename(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if (req.method !== "POST") return jsonError(404);

	let data: any;
	try {
		data = await req.json();
	} catch {
		return jsonError(1001);
	}

	const { user, error } = await authenticateUser(req, ip);
	if (error) return error;

	if (Number(process.env.METRICS_TYPE) >= 3) {
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, user).inc();
	}

	if (!Validate.userFilePathName(data.path)) return jsonError(1005);
	if (!Validate.userFilePathName(data.destination)) return jsonError(1005);

	let res = await Storage.renameUserFile(user, data.path, data.destination);
	if (res === false) return jsonError(2000);

	await Redis.deleteString(`filelist_${user}`);

	return jsonResponse({ error: 0, info: "Success" });
}
