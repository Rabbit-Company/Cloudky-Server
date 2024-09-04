import type { MatchedRoute } from "bun";
import DB from "../../../database/database";
import { authenticateUser, generateRandomText, jsonError, jsonResponse } from "../../../utils";
import Validate from "../../../validate";
import Metrics from "../../../metrics";
import LocalStorage from "../../../storage/localstorage";
import { Error } from "../../../errors";

export default async function handleShareLinkCreate(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
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
	if (data.password !== null && !Validate.password(data.password)) return jsonError(Error.PASSWORD_NOT_HASHED);
	if (data.expiration !== null && !Validate.expiration(data.expiration)) return jsonError(Error.INVALID_EXPIRATION_TIMESTAMP);

	if (!(await LocalStorage.userFileExists(user, data.path))) return jsonError(Error.NON_EXISTENT_SHARE_LINK);

	const id = generateRandomText(15);

	const timestamp = Date.now();
	const result = await DB.prepareModify(
		'INSERT INTO "ShareLinks"("Token","Path","Username","Password","Downloaded","Expiration","Created","Accessed") VALUES(?,?,?,?,?,?,?,?)',
		[id, data.path, user, data.password, 0, data.expiration, timestamp, timestamp]
	);
	if (!result) return jsonError(Error.UNKNOWN_ERROR);

	return jsonResponse({ error: 0, info: "Success", link: id });
}
