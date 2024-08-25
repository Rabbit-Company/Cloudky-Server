import type { ResultSetHeader } from "mysql2/promise";
import MySQL from "./mysql";
import SQLite from "./sqlite";
import MariaDB from "./mariadb";
import Postgres from "./postgres";
import D1 from "./d1";
import Logger from "@rabbit-company/logger";

namespace DB {
	export async function initialize() {
		const dbType = process.env.DB_TYPE;

		Logger.info(`[DB] Initializing ${dbType} database...`);

		try {
			switch (dbType) {
				case "postgres":
					await Postgres.initialize();
					break;
				case "mariadb":
					await MariaDB.initialize();
					break;
				case "mysql":
					await MySQL.initialize();
					break;
				case "sqlite":
					SQLite.initialize();
					break;
				case "d1":
					await D1.initialize();
					break;
				default:
					Logger.error(`[DB] Unsupported database type: ${dbType}`);
					process.exit(1);
			}
		} catch (error) {
			Logger.error(`[DB] Failed to initialize ${dbType} database: ${error}`);
			process.exit(1);
		}

		Logger.info(`[DB] Database successfully initialized.`);
	}

	export async function prepare(query: string, values: any[]): Promise<any[] | null> {
		try {
			if (process.env.DB_TYPE === "postgres") {
				const results = await Postgres.connection.query(query, values);
				return results.rows;
			} else if (process.env.DB_TYPE === "mariadb") {
				const results: any[] = await MariaDB.connection.query(query, values);
				return results;
			} else if (process.env.DB_TYPE === "mysql") {
				const [results] = await MySQL.connection.execute(query, values);
				return Array.isArray(results) ? results : [];
			} else if (process.env.DB_TYPE === "sqlite") {
				return SQLite.connection.prepare(query, values).all();
			} else if (process.env.DB_TYPE === "d1") {
				const res = await D1.connection.allRaw(query, values);
				return res.results;
			} else {
				Logger.error(`[DB] Unsupported database type: ${process.env.DB_TYPE}`);
				process.exit();
			}
		} catch (error) {
			Logger.error("[DB] " + error);
			return null;
		}
	}

	export async function prepareModify(query: string, values: any[]): Promise<boolean | null> {
		try {
			if (process.env.DB_TYPE === "postgres") {
				const res = await Postgres.connection.query(query, values);
				return (res.rowCount || 0) > 0;
			} else if (process.env.DB_TYPE === "mariadb") {
				const res = await MariaDB.connection.query(query, values);
				return res.affectedRows > 0;
			} else if (process.env.DB_TYPE === "mysql") {
				const [results] = await MySQL.connection.execute(query, values);
				return (results as ResultSetHeader).affectedRows > 0;
			} else if (process.env.DB_TYPE === "sqlite") {
				SQLite.connection.prepare(query, values).run();
				return true;
			} else if (process.env.DB_TYPE === "d1") {
				let res;
				if (values.length) res = await D1.connection.execRaw(query, values);
				else res = await D1.connection.execRaw(query);
				return res.success;
			} else {
				Logger.error(`[DB] Unsupported database type: ${process.env.DB_TYPE}`);
				process.exit();
			}
		} catch (error) {
			Logger.error("[DB] " + error);
			return null;
		}
	}
}

export default DB;
