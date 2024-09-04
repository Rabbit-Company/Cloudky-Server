import mysql, { type Pool } from "mysql2/promise";
import DB from "./database";

namespace MySQL {
	export const connection: Pool = mysql.createPool({
		host: process.env.MYSQL_HOST,
		port: Number(process.env.MYSQL_PORT || 3306),
		database: process.env.MYSQL_DATABASE,
		user: process.env.MYSQL_USER,
		password: process.env.MYSQL_PASSWORD,
		waitForConnections: true,
		connectionLimit: 10,
		maxIdle: 10,
		idleTimeout: 0,
		queueLimit: 0,
		enableKeepAlive: true,
		keepAliveInitialDelay: 0,
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
					"Type" INT NOT NULL,
					"Created" BIGINT NOT NULL,
					"Accessed" BIGINT NOT NULL
				);

				CREATE TABLE IF NOT EXISTS "Files"(
					"UUID" VARCHAR(36) PRIMARY KEY,
					"Path" VARCHAR(4096) NOT NULL,
					"Username" VARCHAR(30) NOT NULL,
					"Size" BIGINT,
					"Modified" BIGINT,
					UNIQUE idx_path_username ("Path", "Username")
				);

				CREATE TABLE IF NOT EXISTS "ShareLinks"(
					"Token" VARCHAR(15) PRIMARY KEY,
					"Path" VARCHAR(4096) NOT NULL,
					"Username" VARCHAR(30) NOT NULL,
					"Password" VARCHAR(255),
					"Downloaded" INT NOT NULL,
					"Expiration" BIGINT,
					"Created" BIGINT NOT NULL,
					"Accessed" BIGINT NOT NULL,
					INDEX idx_expiration ("Expiration"),
					INDEX idx_path_username ("Path", "Username")
				);
			`,
			[]
		);

		if (!res) process.exit();
	}
}

export default MySQL;
