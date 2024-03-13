import mysql, { type Pool } from 'mysql2/promise';
import DB from './database';

export default class MySQL{
	static DB : Pool = mysql.createPool({
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
		keepAliveInitialDelay: 0
	});

	static async initialize(){
		let res = await DB.prepareModify(`
			CREATE TABLE IF NOT EXISTS "Accounts"(
				"Username" VARCHAR(30) NOT NULL PRIMARY KEY,
				"Email" VARCHAR(255) NOT NULL,
				"Password" VARCHAR(255) NOT NULL,
				"2faSecret" VARCHAR(20),
				"YubicoOTP" VARCHAR(64),
				"BackupCodes" VARCHAR(69),
				"StorageUsed" INT NOT NULL,
				"StorageLimit" INT NOT NULL,
				"TransferUsed" INT NOT NULL,
				"TransferLimit" INT NOT NULL,
				"Type" INT NOT NULL,
				"Created" BIGINT NOT NULL,
				"Accessed" BIGINT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS "ShareLinks"(
				"Token" VARCHAR(15) NOT NULL PRIMARY KEY,
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