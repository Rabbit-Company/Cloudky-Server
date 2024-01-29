import type { ResultSetHeader } from "mysql2/promise";
import MySQL from "./mysql";
import SQLite from "./sqlite";

export default class DB{

	static async prepare(query: string, values: any[]): Promise<any[]>{
		if(process.env.DB_TYPE === 'mysql'){
			const [results] = await MySQL.DB.execute(query, values);
			if(Array.isArray(results)) return results;
			return [];
		}
		return SQLite.DB.prepare(query, values).all();
	}

	static async prepareModify(query: string, values: any[]): Promise<boolean>{
		if(process.env.DB_TYPE === 'mysql'){
			const [results] = await MySQL.DB.execute(query, values);
			if ((results as ResultSetHeader).affectedRows > 0) return true;
			return false;
		}
		SQLite.DB.prepare(query, values).run();
		return true;
	}
}