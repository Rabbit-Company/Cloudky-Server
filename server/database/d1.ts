import D1API from 'd1-api';
import DB from './database';

export default class D1{
	static DB: D1API = new D1API({
		accountId: process.env.CF_ACCOUNT_ID || '',
		apiKey: process.env.CF_API_KEY || '',
		databaseId: process.env.CF_DATABASE_ID || ''
	});

	static async initialize(){
		const resPromises = [
			DB.prepareModify(`
			CREATE TABLE IF NOT EXISTS "Accounts"(
				"Username" TEXT PRIMARY KEY,
				"Email" TEXT NOT NULL,
				"Password" TEXT NOT NULL,
				"2faSecret" TEXT,
				"YubicoOTP" TEXT,
				"BackupCodes" TEXT,
				"StorageUsed" INTEGER NOT NULL,
				"StorageLimit" INTEGER NOT NULL,
				"Type" INTEGER NOT NULL,
				"Created" INTEGER NOT NULL,
				"Accessed" INTEGER NOT NULL
			);
		`, []),
		DB.prepareModify(`
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
		`, []),
		DB.prepareModify(`
			CREATE INDEX IF NOT EXISTS idx_expiration ON "ShareLinks" ("Expiration");
		`, []),
		DB.prepareModify(`
			CREATE INDEX IF NOT EXISTS idx_path_username ON "ShareLinks" ("Path", "Username");
		`, [])
		]

		const [res, res2, res3, res4] = await Promise.all(resPromises);

		if(!res || !res2 || !res3 || !res4) process.exit();
	}
}