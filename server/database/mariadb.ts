import Logger from '@rabbit-company/logger';
import mariadb from 'mariadb';

export default class MariaDB{
	static DB = mariadb.createPool({
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

	static async initialize(){
		await MariaDB.DB.query(`
			CREATE TABLE IF NOT EXISTS "Accounts"(
				"Username" VARCHAR(30) NOT NULL PRIMARY KEY,
				"Email" VARCHAR(255) NOT NULL,
				"Password" VARCHAR(255) NOT NULL,
				"2faSecret" VARCHAR(20),
				"YubicoOTP" VARCHAR(64),
				"BackupCodes" VARCHAR(69),
				"StorageUsed" INT NOT NULL,
				"StorageLimit" INT NOT NULL,
				"Created" BIGINT NOT NULL,
				"Accessed" BIGINT NOT NULL
			);
		`).catch(() => {
			Logger.error('Connection to MariaDB server has failed!');
			process.exit();
		});
	}
}