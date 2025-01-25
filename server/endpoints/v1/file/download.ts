import type { MatchedRoute } from "bun";
import { authenticateUser, jsonError, jsonResponse } from "../../../utils";
import S3 from "../../../storage/s3storage";
import LocalStorage from "../../../storage/localstorage";
import Metrics from "../../../metrics";
import Validate from "../../../validate";
import { Error } from "../../../errors";

export default async function handleFileDownload(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
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

	if (!Validate.userFilePathName(data.path)) return jsonError(Error.INVALID_FILE_NAME);

	if (process.env.S3_ENABLED === "true") {
		const res = S3.getUserObjectLink(user, data.path);
		if (res === null) return jsonError(Error.UNKNOWN_ERROR);
		return jsonResponse({ error: 0, info: "Success", link: res });
	}

	const res = await LocalStorage.downloadUserFile(user, data.path);
	if (res === null) return jsonError(Error.UNKNOWN_ERROR);

	const parts = data.path.split("/");
	const fileName = parts[parts.length - 1];

	const headers = new Headers({
		"Content-Length": "" + res.size,
		"Last-Modified": new Date(res.lastModified).toUTCString(),
		ETag: `W/"${res.size}-${res.lastModified}"`,
		"Content-Disposition": `attachment; filename="${fileName}"`,
	});

	if (req.headers.get("if-none-match") === headers.get("ETag")) {
		return new Response(null, { status: 304 });
	}

	const opts = { code: 200, start: 0, end: Infinity, range: false };

	if (req.headers.has("range")) {
		opts.code = 206;
		let [x, y] = req.headers.get("range")!.replace("bytes=", "").split("-");
		let end = (opts.end = parseInt(y, 10) || res.size - 1);
		let start = (opts.start = parseInt(x, 10) || 0);

		if (start >= res.size || end >= res.size) {
			headers.set("Content-Range", `bytes */${res.size}`);
			return new Response(null, {
				headers: headers,
				status: 416,
			});
		}

		headers.set("Content-Range", `bytes ${start}-${end}/${res.size}`);
		headers.set("Content-Length", "" + (end - start + 1));
		headers.set("Accept-Ranges", "bytes");
		opts.range = true;
	}

	if (opts.range) {
		return new Response(res.slice(opts.start, opts.end + 1), {
			headers,
			status: opts.code,
		});
	}

	return new Response(res, {
		headers,
	});
}
