import Logger from "@rabbit-company/logger";
import type { FileInformation } from "./storage";
import DB from "../database/database";
import { S3Client } from "bun";

namespace S3 {
	export const bucket = new S3Client({
		accessKeyId: process.env.S3_ACCESS_KEY,
		secretAccessKey: process.env.S3_SECRET_KEY,
		bucket: process.env.S3_BUCKET_NAME,
		region: process.env.S3_REGION,
		endpoint: process.env.S3_ENDPOINT,
	});

	export async function userFileExists(username: string, key: string): Promise<boolean | null> {
		try {
			const results = await DB.prepare('SELECT * FROM "Files" WHERE "Username" = ? AND "Path" = ?', [username, key]);
			return results !== null && results.length > 0;
		} catch (err) {
			Logger.error(`[S3] ${err}`);
			return null;
		}
	}

	export async function deleteObjects(keys: string[]): Promise<boolean> {
		try {
			await Promise.all(keys.map((key) => bucket.delete(key)));
			return true;
		} catch (err) {
			Logger.error(`[S3] ${err}`);
			return false;
		}
	}

	export function getObjectLink(key: string, expiresIn: number = 3600): string | null {
		try {
			return bucket.presign(key, {
				method: "GET",
				expiresIn: expiresIn,
			});
		} catch (err) {
			Logger.error(`[S3] ${err}`);
			return null;
		}
	}

	export function putObjectLink(key: string, expiresIn: number = 3600): string | null {
		try {
			return bucket.presign(key, {
				method: "PUT",
				expiresIn: expiresIn,
			});
		} catch (err) {
			Logger.error(`[S3] ${err}`);
			return null;
		}
	}

	export async function putObject(key: string, body: Blob): Promise<boolean | null> {
		try {
			await bucket.write(key, body);
			return true;
		} catch (err) {
			Logger.error(`[S3] ${err}`);
			return null;
		}
	}

	export async function listUserFiles(username: string): Promise<FileInformation[] | null> {
		try {
			const results = await DB.prepare('SELECT "Path", "Size", "Modified" FROM "Files" WHERE "Username" = ?', [username]);
			if (results === null) return null;

			const files: FileInformation[] = results.map(({ Path, Size, Modified }) => ({
				Key: Path.replace(`data/${username}/`, ""),
				Size,
				Modified,
			}));

			return files;
		} catch (err) {
			Logger.error(`[S3] ${err}`);
			return null;
		}
	}

	export async function deleteUserFiles(username: string, keys: string[]): Promise<boolean> {
		return await deleteObjects(keys.map((key) => `data/${username}/${key}`));
	}

	export async function uploadUserFile(username: string, key: string, body: Blob): Promise<boolean | null> {
		return await putObject(`data/${username}/${key}`, body);
	}

	export function getUserObjectLink(username: string, key: string): string | null {
		return getObjectLink(`data/${username}/${key}`, 43200);
	}

	export function putUserObjectLink(username: string, key: string): string | null {
		return putObjectLink(`data/${username}/${key}`, 43200);
	}
}

export default S3;
