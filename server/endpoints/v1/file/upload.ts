import type { MatchedRoute } from "bun";
import { authenticateUser, generateRandomText, jsonError, jsonResponse } from "../../../utils";
import Validate from "../../../validate";
import Redis from "../../../database/redis";
import Storage from "../../../storage/storage";
import S3 from "../../../storage/s3storage";
import Metrics from "../../../metrics";
import { Error } from "../../../errors";

export default async function handleFileUpload(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if (req.method === "POST" && process.env.S3_ENABLED === "true") {
		return await s3FileUpload(req, ip);
	} else if (req.method === "POST" && process.env.S3_ENABLED !== "true") {
		return await localFileUploadToken(req, ip);
	} else if (req.method === "PUT" && process.env.S3_ENABLED !== "true") {
		return await localFileUpload(req, ip);
	} else if (req.method === "PATCH" && process.env.S3_ENABLED !== "true") {
		return await localFilePatch(req, ip);
	} else {
		return jsonError(Error.INVALID_ENDPOINT);
	}
}

async function localFileUploadToken(req: Request, ip: string | undefined): Promise<Response> {
	const { user, error } = await authenticateUser(req, ip);
	if (error) return error;

	if (Number(process.env.METRICS_TYPE) >= 3) {
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, user).inc();
	}

	let data: any;
	try {
		data = await req.json();
	} catch {
		return jsonError(Error.REQUIRED_DATA_MISSING);
	}

	if (!Validate.userFilePathName(data.path)) return jsonError(Error.INVALID_FILE_NAME);

	const token = generateRandomText(128);
	const tokenData = {
		user: user,
		path: data.path,
	};
	const activated = await Redis.setString(`upload_token_${token}`, JSON.stringify(tokenData), 864000, 864000);
	if (!activated) return jsonError(Error.UNKNOWN_ERROR);

	return jsonResponse({ error: 0, info: "Success", link: `${req.url}?token=${token}` });
}

async function localFileUpload(req: Request, ip: string | undefined): Promise<Response> {
	const token = new URL(req.url).searchParams.get("token");

	if (!Validate.token(token)) return jsonError(Error.INVALID_TOKEN);

	const tokenData = await Redis.getString(`upload_token_${token}`);
	if (!tokenData) return jsonError(Error.TOKEN_EXPIRED);

	let data;
	try {
		data = JSON.parse(tokenData);
	} catch {
		return jsonError(Error.TOKEN_EXPIRED);
	}

	if (typeof data.user !== "string" || typeof data.path !== "string") return jsonError(Error.TOKEN_EXPIRED);

	const contentLength = req.headers.get("Content-Length");
	if (contentLength && parseInt(contentLength, 10) > 5_368_709_120) {
		return jsonError(Error.MAX_FILE_SIZE_EXCEEDED);
	}

	const fileContent = await req.blob();

	if (fileContent.size === 0) {
		return jsonError(Error.INVALID_FILE);
	}

	// 5GB max file size
	if (fileContent.size > 5_368_709_120) {
		return jsonError(Error.MAX_FILE_SIZE_EXCEEDED);
	}

	const res = await Storage.uploadUserFile(data.user, data.path, fileContent);
	if (res === null) return jsonError(Error.UNKNOWN_ERROR);

	await Redis.deleteString(`filelist_${data.user}`);

	return jsonError(Error.SUCCESS);
}

async function localFilePatch(req: Request, ip: string | undefined): Promise<Response> {
	return jsonError(Error.SUCCESS);
}

async function s3FileUpload(req: Request, ip: string | undefined): Promise<Response> {
	const { user, error } = await authenticateUser(req, ip);
	if (error) return error;

	if (Number(process.env.METRICS_TYPE) >= 3) {
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, user).inc();
	}

	let data: any;
	try {
		data = await req.json();
	} catch {
		return jsonError(Error.REQUIRED_DATA_MISSING);
	}

	if (!Validate.userFilePathName(data.path)) return jsonError(Error.INVALID_FILE_NAME);

	const res = S3.putUserObjectLink(user, data.path);
	if (res === null) return jsonError(Error.UNKNOWN_ERROR);
	return jsonResponse({ error: 0, info: "Success", link: res });
}
