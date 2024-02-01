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
		`);
	}
}