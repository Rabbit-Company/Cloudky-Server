import Database from "bun:sqlite";

export default class SQLite{
	static DB: Database = new Database(process.env.SQLITE_FILE || "cloudky.sqlite", { readwrite: true, create: true });

	static initialize(){
		SQLite.DB.run("PRAGMA journal_mode = WAL;");
		SQLite.DB.run(`
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

			CREATE TABLE IF NOT EXISTS "ShareLinks"(
				"Token" TEXT NOT NULL PRIMARY KEY,
				"Path" TEXT NOT NULL,
				"Username" TEXT NOT NULL,
				"Password" TEXT,
				"Downloaded" INTEGER NOT NULL,
				"Expiration" INTEGER,
				"Created" INTEGER NOT NULL,
				"Accessed" INTEGER NOT NULL,
				INDEX idx_expiration ("Expiration"),
				INDEX idx_path_username ("Path", "Username")
			);
		`);
	}
}