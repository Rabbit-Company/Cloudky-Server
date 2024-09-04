import type { MatchedRoute } from "bun";
import DB from "../../../database/database";
import { authenticateUser, jsonError } from "../../../utils";
import Metrics from "../../../metrics";
import { Error } from "../../../errors";
import Storage from "../../../storage/storage";

export default async function handleAccountDelete(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if (req.method !== "DELETE") return jsonError(Error.INVALID_ENDPOINT);

	const { user, error } = await authenticateUser(req, ip);
	if (error) return error;

	if (Number(process.env.METRICS_TYPE) >= 3) {
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, user).inc();
	}

	// Delete share links
	const result = await DB.prepareModify('DELETE FROM "ShareLinks" WHERE "Username" = ?', [user]);
	if (!result) return jsonError(Error.UNKNOWN_ERROR);

	// Get files
	const files = await Storage.listUserFiles(user);
	if (!files) return jsonError(Error.UNKNOWN_ERROR);

	// Delete files
	const result2 = await Storage.deleteUserFiles(
		user,
		files.map((file) => file.Key)
	);
	if (result2 === false) return jsonError(Error.UNKNOWN_ERROR);

	// Delete account
	const result3 = await DB.prepareModify('DELETE FROM "Accounts" WHERE "Username" = ?', [user]);
	if (!result3) return jsonError(Error.UNKNOWN_ERROR);

	return jsonError(Error.SUCCESS);
}
