import mysql, { type Pool } from 'mysql2/promise';

export default class MySQL{
	static DB : Pool = mysql.createPool({
		host: process.env.MYSQL_HOST,
		port: Number(process.env.MYSQL_PORT || 3306),
		database: process.env.MYSQL_DATABASE,
		user: process.env.MYSQL_USER,
		password: process.env.MYSQL_PASSWORD
	});

	static initialize(){
		MySQL.DB.execute(`
			CREATE TABLE IF NOT EXISTS "Accounts"(
				"Username" VARCHAR(30) NOT NULL PRIMARY KEY,
				"Email" VARCHAR(255) NOT NULL,
				"Password" VARCHAR(255) NOT NULL,
				"2faSecret" VARCHAR(20),
				"YubicoOTP" VARCHAR(64),
				"BackupCodes" VARCHAR(69),
				"StorageUsed" INT NOT NULL,
				"StorageLimit" INT NOT NULL,
				"Created" INT NOT NULL,
				"Accessed" INT NOT NULL
			);
		`);
	}
}