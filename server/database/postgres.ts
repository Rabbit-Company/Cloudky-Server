import { Client } from "pg";
import DB from "./database";

namespace Postgres {
	export const connection = new Client({
		host: process.env.POSTGRES_HOST,
		port: Number(process.env.POSTGRES_PORT) || 5432,
		database: process.env.POSTGRES_DATABASE,
		user: process.env.POSTGRES_USER,
		password: process.env.POSTGRES_PASSWORD,
		keepAlive: true,
	});

	export async function initialize() {
		const res = await DB.prepareModify(
			`
				CREATE TABLE IF NOT EXISTS "Accounts"(
					"Username" VARCHAR(30) PRIMARY KEY,
					"Email" VARCHAR(255) NOT NULL,
					"Password" VARCHAR(255) NOT NULL,
					"TwoFaSecret" VARCHAR(20),
					"YubicoOTP" VARCHAR(64),
					"BackupCodes" VARCHAR(69),
					"StorageUsed" BIGINT NOT NULL,
					"StorageLimit" BIGINT NOT NULL,
					"DownloadUsed" BIGINT NOT NULL,
					"DownloadLimit" BIGINT NOT NULL,
					"UploadUsed" BIGINT NOT NULL,
					"UploadLimit" BIGINT NOT NULL,
					"Type" INTEGER NOT NULL,
					"Created" BIGINT NOT NULL,
					"Accessed" BIGINT NOT NULL
				);

				CREATE TABLE IF NOT EXISTS "Files"(
					"UUID" VARCHAR(36) PRIMARY KEY,
					"Path" VARCHAR(4096) NOT NULL,
					"Username" VARCHAR(30) NOT NULL,
					"Size" BIGINT,
					"Modified" BIGINT,
					CONSTRAINT "idx_path_username" UNIQUE ("Path", "Username")
				);

				CREATE TABLE IF NOT EXISTS "ShareLinks"(
					"Token" VARCHAR(15) PRIMARY KEY,
					"Path" VARCHAR(4096) NOT NULL,
					"Username" VARCHAR(30) NOT NULL,
					"Password" VARCHAR(255),
					"Downloaded" INTEGER NOT NULL,
					"Expiration" BIGINT,
					"Created" BIGINT NOT NULL,
					"Accessed" BIGINT NOT NULL
				);

				CREATE INDEX IF NOT EXISTS idx_expiration ON "ShareLinks" ("Expiration");
				CREATE INDEX IF NOT EXISTS idx_path_username ON "ShareLinks" ("Path", "Username");
			`,
			[]
		);

		if (!res) process.exit();
	}
}

export default Postgres;
