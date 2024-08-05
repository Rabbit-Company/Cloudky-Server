import type { MatchedRoute } from "bun";
import { authenticateUser, jsonError, jsonResponse } from "../../../utils";
import Validate from "../../../validate";
import Redis from "../../../database/redis";
import Storage from "../../../storage/storage";
import S3 from "../../../storage/s3storage";
import Metrics from "../../../metrics";

export default async function handleFileUpload(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	const { user, error } = await authenticateUser(req, ip);
	if (error) return error;

	if (Number(process.env.METRICS_TYPE) >= 3) {
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, user).inc();
	}

	if (req.method === "POST" && process.env.S3_ENABLED === "true") {
		return await s3FileUpload(req, user);
	} else if (req.method === "PUT" && process.env.S3_ENABLED !== "true") {
		return await localFileUpload(req, user);
	} else {
		return jsonError(404);
	}
}

async function s3FileUpload(req: Request, username: string): Promise<Response> {
	let data: any;
	try {
		data = await req.json();
	} catch {
		return jsonError(1001);
	}

	if (!Validate.userFilePathName(data.path)) return jsonError(1005);

	let res = await S3.getUserMultipartUploadLink(username, data.path);
	if (res === null) return jsonError(2000);
	return jsonResponse({ error: 0, info: "Success", link: res });
}

async function localFileUpload(req: Request, username: string): Promise<Response> {
	const contentLength = req.headers.get("Content-Length");
	if (contentLength && parseInt(contentLength, 10) > 53_687_091_200) {
		return jsonError(1010);
	}

	const formdata = await req.formData();
	const key = formdata.get("name")?.toString();
	const file = formdata.get("file");

	if (!Validate.userFilePathName(key)) return jsonError(1005);
	if (!(file instanceof File) || file.size === 0) {
		return jsonError(1006);
	}

	const fileSizeInBytes = file.size || 0;
	const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

	// 50GB max file size
	if (fileSizeInMB > 51_200) {
		return jsonError(1010);
	}

	let res = await Storage.uploadUserFile(username, key!, file);
	if (res === null) return jsonError(2000);

	await Redis.deleteString(`filelist_${username}`);

	return jsonResponse({ error: 0, info: "Success" });
}
