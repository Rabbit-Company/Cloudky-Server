import { Glob } from "bun";
import type { FileInformation } from "./storage";
import type { BunFile } from "bun";
import { mkdir, unlink, rename, readdir, rm } from "fs/promises";
import path from "node:path";
import DB from "../database/database";

namespace LocalStorage {
	export async function listUserFiles(username: string): Promise<FileInformation[]> {
		try {
			const glob = new Glob("**");
			const path = `${process.env.DATA_DIRECTORY}/data/${username}/`;

			const files: FileInformation[] = [];
			for await (const fileName of glob.scan({ cwd: path, dot: true, onlyFiles: true, absolute: false })) {
				let file = Bun.file(`${path}/${fileName}`);
				files.push({
					Key: fileName,
					Modified: file.lastModified,
					Size: file.size,
				});
			}

			return files;
		} catch {
			return [];
		}
	}

	export async function userFileExists(username: string, key: string): Promise<boolean | null> {
		try {
			return await Bun.file(`${process.env.DATA_DIRECTORY}/data/${username}/${key}`).exists();
		} catch {
			return null;
		}
	}

	export async function uploadUserFile(username: string, key: string, body: Blob): Promise<boolean> {
		try {
			const filePath = `${process.env.DATA_DIRECTORY}/data/${username}/${key}`;
			const file = Bun.file(filePath);

			const fileSize = (await file.exists()) ? file.size : 0;

			const results: any = await DB.prepare(
				`
				SELECT
					"UploadUsed",
					"UploadLimit",
					"StorageUsed",
					"StorageLimit"
				FROM "Accounts" WHERE "Username" = ?
				`,
				[username]
			);
			if (results === null || results.length !== 1) return false;

			const uploadUsed = results[0].UploadUsed + body.size;
			if (uploadUsed > results[0].UploadLimit) return false;

			const storageUsed = results[0].StorageUsed - fileSize + body.size;
			if (storageUsed > results[0].StorageLimit) return false;

			const result2 = await DB.prepareModify('UPDATE "Accounts" SET "UploadUsed" = ?, "StorageUsed" = ? WHERE "Username" = ?', [
				uploadUsed,
				storageUsed,
				username,
			]);
			if (!result2) return false;

			await Bun.write(filePath, body, { createPath: true });
			return true;
		} catch {
			return false;
		}
	}

	export async function downloadUserFile(username: string, key: string, sharelink?: string): Promise<BunFile | null> {
		try {
			const file = Bun.file(`${process.env.DATA_DIRECTORY}/data/${username}/${key}`);
			if (!(await file.exists())) return null;

			const results: any = await DB.prepare(`SELECT "DownloadUsed", "DownloadLimit" FROM "Accounts" WHERE "Username" = ?`, [username]);
			if (results === null || results.length !== 1) return null;

			const downloadUsed = file.size + results[0].DownloadUsed;
			if (downloadUsed > results[0].DownloadLimit) return null;

			const result2 = await DB.prepareModify('UPDATE "Accounts" SET "DownloadUsed" = ? WHERE "Username" = ?', [downloadUsed, username]);
			if (!result2) return null;

			if (sharelink) {
				const result = await DB.prepareModify('UPDATE "ShareLinks" SET "Downloaded" = "Downloaded" + 1 WHERE "Token" = ?', [sharelink]);
				if (!result) return null;
			}

			return file;
		} catch {
			return null;
		}
	}

	export async function moveUserFiles(username: string, keys: string[], destination: string): Promise<boolean> {
		try {
			destination = `${process.env.DATA_DIRECTORY}/data/${username}/${destination}`;
			await mkdir(destination, { recursive: true });
			for (let i = 0; i < keys.length; i++) {
				const file = `${process.env.DATA_DIRECTORY}/data/${username}/${keys[i]}`;
				await rename(file, `${destination}/${path.basename(file)}`);
			}
			return true;
		} catch {
			return false;
		}
	}

	export async function renameUserFile(username: string, key: string, destination: string): Promise<boolean> {
		try {
			key = `${process.env.DATA_DIRECTORY}/data/${username}/${key}`;
			destination = `${process.env.DATA_DIRECTORY}/data/${username}/${destination}`;
			await mkdir(path.dirname(destination), { recursive: true });
			await rename(key, destination);
			return true;
		} catch {
			return false;
		}
	}

	export async function deleteUserFiles(username: string, keys: string[]): Promise<boolean> {
		try {
			const dirPath = `${process.env.DATA_DIRECTORY}/data/${username}`;

			await Promise.all(
				keys.map(async (key) => {
					const filePath = `${dirPath}/${key}`;
					if (await Bun.file(filePath).exists()) await unlink(filePath);

					const parentDir = filePath.substring(0, filePath.lastIndexOf("/"));

					let numOfFiles = 0;
					const glob = new Glob("**");
					for await (const fileName of glob.scan({ cwd: parentDir, dot: true, onlyFiles: true, absolute: false })) {
						if (!fileName.includes(".DS_Store")) numOfFiles++;
					}
					if (numOfFiles === 0) await rm(parentDir, { force: true, recursive: true });
				})
			);

			return true;
		} catch {
			return false;
		}
	}
}

export default LocalStorage;
