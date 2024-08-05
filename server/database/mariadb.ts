import mariadb from 'mariadb';
import DB from './database';

export namespace MariaDB{

	export const connection = mariadb.createPool({
		host: process.env.MARIADB_HOST,
		port: Number(process.env.MARIADB_PORT || 3306),
		database: process.env.MARIADB_DATABASE,
		user: process.env.MARIADB_USER,
		password: process.env.MARIADB_PASSWORD,
		connectionLimit: 10,
		idleTimeout: 0,
		keepAliveDelay: 0,
		acquireTimeout: 3000
	});

	export async function initialize(){
		let res = await DB.prepareModify(`
			CREATE TABLE IF NOT EXISTS "Accounts"(
				"Username" VARCHAR(30) PRIMARY KEY,
				"Email" VARCHAR(255) NOT NULL,
				"Password" VARCHAR(255) NOT NULL,
				"2faSecret" VARCHAR(20),
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
	`, []);

		if(!res) process.exit();
	}
}

export default MariaDB;