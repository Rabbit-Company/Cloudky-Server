import { type MatchedRoute } from "bun";
import Redis from "../../../database/redis";
import { basicAuthentication, generateHash, generateRandomText, jsonError, jsonResponse } from "../../../utils";
import Validate from "../../../validate";
import DB from "../../../database/database";
import Metrics from "../../../metrics";
import { Error } from "../../../errors";

export default async function handleAccountToken(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if (req.method !== "POST") return jsonError(Error.INVALID_ENDPOINT);

	const auth = basicAuthentication(req);
	if (auth === null) return jsonError(Error.MISSING_AUTHORIZATION_HEADER);

	if (!Validate.username(auth.user)) return jsonError(Error.INVALID_USERNAME);
	if (!Validate.password(auth.pass)) return jsonError(Error.INVALID_PASSWORD);

	let result = await DB.prepare('SELECT "Password" FROM "Accounts" WHERE "Username" = ?', [auth.user]);
	if (result === null) return jsonError(Error.UNKNOWN_ERROR);
	if (result.length !== 1) return jsonError(Error.INVALID_USERNAME);

	if (!(await Bun.password.verify(auth.pass, result[0].Password))) return jsonError(Error.INCORRECT_PASSWORD);

	let hashedIP = await generateHash(ip || "", "sha256");
	let newToken = generateRandomText(128);
	let token = await Redis.getOrSetString(`token_${auth.user}_${hashedIP}`, newToken, 60, 3600);
	if (token === null) return jsonError(Error.REDIS_CONNECTION_ERROR);

	if (Number(process.env.METRICS_TYPE) >= 3) {
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, auth.user).inc();
	}

	let timestamp = Date.now();
	await DB.prepare('UPDATE "Accounts" SET "Accessed" = ? WHERE "Username" = ?', [timestamp, auth.user]);

	return jsonResponse({ error: 0, info: "Success", token: token });
}
