import type { MatchedRoute } from "bun";
import { authenticateUser, jsonError } from "../../../utils";
import Redis from "../../../database/redis";
import Storage from "../../../storage/storage";
import Metrics from "../../../metrics";
import Validate from "../../../validate";
import { Error } from "../../../errors";

export default async function handleFileMove(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
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

	if (!Validate.userFilePathNames(data.files)) return jsonError(Error.INVALID_FILE_NAME);
	if (!Validate.userFilePathName(data.destination)) return jsonError(Error.INVALID_FILE_NAME);

	const res = await Storage.moveUserFiles(user, data.files, data.destination);
	if (res === false) return jsonError(Error.UNKNOWN_ERROR);

	await Redis.deleteString(`filelist_${user}`);

	return jsonError(Error.SUCCESS);
}
