import type { MatchedRoute } from "bun";
import { authenticateUser, generateRandomText, jsonError, jsonResponse } from "../../../utils";
import S3 from "../../../storage/s3storage";
import LocalStorage from "../../../storage/localstorage";
import Metrics from "../../../metrics";
import Validate from "../../../validate";
import { Error } from "../../../errors";
import Blake2b from "@rabbit-company/blake2b";
import Redis from "../../../database/redis";

export default async function handleFileDownload(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if (req.method === "POST" && process.env.S3_ENABLED === "true") {
		return await s3FileDownload(req, ip);
	} else if (req.method === "POST" && process.env.S3_ENABLED !== "true") {
		return await localFileDownloadToken(req, ip);
	} else if (req.method === "GET" && process.env.S3_ENABLED !== "true") {
		return await localFileDownload(req, ip);
	} else {
		return jsonError(Error.INVALID_ENDPOINT);
	}
}

async function localFileDownloadToken(req: Request, ip: string | undefined): Promise<Response> {
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

	if (!(await LocalStorage.userFileExists(user, data.path))) return jsonError(Error.FILE_NOT_FOUND);

	const token = generateRandomText(128);
	const tokenData = {
		user: user,
		path: data.path,
	};
	const activated = await Redis.setString(`download_token_${token}`, JSON.stringify(tokenData), 864000, 864000);
	if (!activated) return jsonError(Error.UNKNOWN_ERROR);

	return jsonResponse({ error: 0, info: "Success", token: token });
}

async function localFileDownload(req: Request, ip: string | undefined): Promise<Response> {
	const token = new URL(req.url).searchParams.get("token");

	if (!Validate.token(token)) return jsonError(Error.INVALID_TOKEN);

	const tokenData = await Redis.getString(`download_token_${token}`);
	if (!tokenData) return jsonError(Error.TOKEN_EXPIRED);

	let data;
	try {
		data = JSON.parse(tokenData);
	} catch {
		return jsonError(Error.TOKEN_EXPIRED);
	}

	if (typeof data.user !== "string" || typeof data.path !== "string") return jsonError(Error.TOKEN_EXPIRED);

	const res = await LocalStorage.downloadUserFile(data.user, data.path);
	if (res === null) return jsonError(Error.UNKNOWN_ERROR);

	const headers = new Headers({
		"Content-Length": "" + res.size,
		"Last-Modified": new Date(res.lastModified).toUTCString(),
		ETag: Blake2b.hash(`${res.size}-${res.lastModified}`),
		"Content-Disposition": `attachment; filename="${data.path.split("/").pop()}"`,
	});

	if (req.headers.get("if-none-match") === headers.get("ETag")) {
		return new Response(null, { headers: headers, status: 304 });
	}

	if (req.headers.get("if-modified-since") && res.lastModified <= new Date(req.headers.get("if-modified-since") || 0).getTime()) {
		return new Response(null, { headers: headers, status: 304 });
	}

	const opts = { code: 200, start: 0, end: Infinity, range: false };

	if (req.headers.has("range")) {
		opts.code = 206;
		const range = req.headers.get("range")!.replace("bytes=", "").split("-");
		const start = (opts.start = parseInt(range[0], 10) || 0);
		const end = (opts.end = parseInt(range[1], 10) || res.size - 1);

		if (start >= res.size || end >= res.size) {
			headers.set("Content-Range", `bytes */${res.size}`);
			return new Response(null, { headers: headers, status: 416 });
		}

		headers.set("Content-Range", `bytes ${start}-${end}/${res.size}`);
		headers.set("Content-Length", "" + (end - start + 1));
		headers.set("Accept-Ranges", "bytes");
		opts.range = true;
	}

	const responseBody = opts.range ? res.slice(opts.start, opts.end + 1) : res;
	return new Response(responseBody, { headers, status: opts.code });
}

async function s3FileDownload(req: Request, ip: string | undefined): Promise<Response> {
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

	const res = S3.getUserObjectLink(user, data.path);
	if (res === null) return jsonError(Error.UNKNOWN_ERROR);
	return jsonResponse({ error: 0, info: "Success", link: res });
}
