import type { MatchedRoute } from "bun";
import { authenticateUser, jsonError, jsonResponse } from "../../../utils";
import Redis from "../../../database/redis";
import Storage from "../../../storage/storage";
import DB from "../../../database/database";
import Metrics from "../../../metrics";

export default async function handleFileList(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if (req.method !== "GET") return jsonError(404);

	const { user, error } = await authenticateUser(req, ip);
	if (error) return error;

	if (Number(process.env.METRICS_TYPE) >= 3) {
		Metrics.http_auth_requests_total.labels(new URL(req.url).pathname, user).inc();
	}

	let fromCache = false;
	let result: any = await Redis.getString(`filelist_${user}`, 60);
	if (result !== null) {
		result = JSON.parse(result);
		fromCache = true;
	}

	if (result === null) result = await Storage.listUserFiles(user);
	if (result === null) return jsonError(2000);

	if (!fromCache) {
		let storageUsage = Math.floor(Storage.calculateStorageUsage(result));
		await Redis.setString(`filelist_${user}`, JSON.stringify(result), 60, 300);
		await Redis.setString(`storageUsage_${user}`, storageUsage.toString(), 60, 300);
		await DB.prepareModify('UPDATE "Accounts" SET "StorageUsed" = ? WHERE "Username" = ?', [storageUsage, user]);
	}

	return jsonResponse({ error: 0, info: "Success", data: result });
}
