import type { MatchedRoute } from "bun";
import { authenticateUser, jsonError, jsonResponse } from "../../../utils";
import S3 from "../../../storage/s3storage";
import LocalStorage from "../../../storage/localstorage";
import Metrics from "../../../metrics";

export default async function handleFileDownload(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
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

	if (process.env.S3_ENABLED === "true") {
		let res = await S3.getUserObjectLink(user, data.path);
		if (res === null) return jsonError(2000);
		return jsonResponse({ error: 0, info: "Success", link: res });
	}

	let res = await LocalStorage.downloadUserFile(user, data.path);
	if (res === null) return jsonError(2000);

	const parts = data.path.split("/");
	const fileName = parts[parts.length - 1];

	const response = new Response(res);
	response.headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
	return response;
}
