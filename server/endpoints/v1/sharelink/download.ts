import type { MatchedRoute } from "bun";
import { jsonError, jsonResponse, timingSafeEqual } from "../../../utils";
import S3 from "../../../storage/s3storage";
import LocalStorage from "../../../storage/localstorage";
import Validate from "../../../validate";
import { Error } from "../../../errors";
import DB from "../../../database/database";
import type { ShareLink } from "../../../sharelink/sharelink";

export default async function handleShareLinkDownload(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if (req.method !== "POST") return jsonError(Error.INVALID_ENDPOINT);

	let data: any;
	try {
		data = await req.json();
	} catch {
		return jsonError(Error.REQUIRED_DATA_MISSING);
	}

	if (!Validate.sharelink(data.link)) return jsonError(Error.INVALID_SHARE_LINK);
	if (data.password !== null && !Validate.password(data.password)) return jsonError(Error.PASSWORD_NOT_HASHED);

	const results = await DB.prepare(
		`
		SELECT
			"Token",
			"Path",
			"Username",
			"Password",
			"Downloaded",
			"Expiration",
			"Created",
			"Accessed"
		FROM "ShareLinks"
		WHERE "Token" = ?
		`,
		[data.link]
	);
	if (!results) return jsonError(Error.UNKNOWN_ERROR);
	if (results.length !== 1) return jsonError(Error.INVALID_SHARE_LINK);

	const shareLink: ShareLink = results[0];

	if (shareLink.Password !== null) {
		if (typeof data.password !== "string" || !timingSafeEqual(data.password, shareLink.Password)) return jsonError(Error.INCORRECT_PASSWORD);
	}

	if (process.env.S3_ENABLED === "true") {
		const res = await S3.getUserObjectLink(shareLink.Username, shareLink.Path);
		if (res === null) return jsonError(Error.UNKNOWN_ERROR);
		return jsonResponse({ error: 0, info: "Success", link: res });
	}

	const res = await LocalStorage.downloadUserFile(shareLink.Username, shareLink.Path, shareLink.Token);
	if (res === null) return jsonError(Error.UNKNOWN_ERROR);

	const parts = shareLink.Path.split("/");
	const fileName = parts[parts.length - 1];

	const response = new Response(res);
	response.headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
	return response;
}
