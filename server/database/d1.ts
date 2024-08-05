import D1API from "d1-api";
import DB from "./database";

namespace D1 {
	export const connection: D1API = new D1API({
		accountId: process.env.CF_ACCOUNT_ID || "",
		apiKey: process.env.CF_API_KEY || "",
		databaseId: process.env.CF_DATABASE_ID || "",
	});

	export async function initialize() {
		const resPromises = [
			DB.prepareModify(
				`
					CREATE TABLE IF NOT EXISTS "Accounts"(
						"Username" TEXT PRIMARY KEY,
						"Email" TEXT NOT NULL,
						"Password" TEXT NOT NULL,
						"2faSecret" TEXT,
						"YubicoOTP" TEXT,
						"BackupCodes" TEXT,
						"StorageUsed" INTEGER NOT NULL,
						"StorageLimit" INTEGER NOT NULL,
						"DownloadUsed" INTEGER NOT NULL,
						"DownloadLimit" INTEGER NOT NULL,
						"UploadUsed" INTEGER NOT NULL,
						"UploadLimit" INTEGER NOT NULL,
						"Type" INTEGER NOT NULL,
						"Created" INTEGER NOT NULL,
						"Accessed" INTEGER NOT NULL
					);
				`,
				[]
			),
			DB.prepareModify(
				`
					CREATE TABLE IF NOT EXISTS "Files"(
						"UUID" TEXT PRIMARY KEY,
						"Path" TEXT NOT NULL,
						"Username" TEXT NOT NULL,
						"Size" INTEGER,
						"Modified" INTEGER
					);
				`,
				[]
			),
			DB.prepareModify(
				`
					CREATE TABLE IF NOT EXISTS "ShareLinks"(
						"Token" TEXT NOT NULL PRIMARY KEY,
						"Path" TEXT NOT NULL,
						"Username" TEXT NOT NULL,
						"Password" TEXT,
						"Downloaded" INTEGER NOT NULL,
						"Expiration" INTEGER,
						"Created" INTEGER NOT NULL,
						"Accessed" INTEGER NOT NULL
					);
				`,
				[]
			),
			DB.prepareModify(
				`
					CREATE INDEX IF NOT EXISTS idx_expiration ON "ShareLinks" ("Expiration");
				`,
				[]
			),
			DB.prepareModify(
				`
					CREATE INDEX IF NOT EXISTS idx_path_username ON "ShareLinks" ("Path", "Username");
				`,
				[]
			),
			DB.prepareModify(
				`
					CREATE UNIQUE INDEX IF NOT EXISTS idx_path_username ON "Files" ("Path", "Username");
				`,
				[]
			),
		];

		const [res, res2, res3, res4] = await Promise.all(resPromises);

		if (!res || !res2 || !res3 || !res4) process.exit();
	}
}

export default D1;
