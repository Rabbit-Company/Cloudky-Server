import type { ResultSetHeader } from "mysql2/promise";
import MySQL from "./mysql";
import SQLite from "./sqlite";
import MariaDB from "./mariadb";

export default class DB{

	static async initialize(){
		if(process.env.DB_TYPE === 'mariadb'){
			await MariaDB.initialize();
		}else if(process.env.DB_TYPE === 'mysql'){
			await MySQL.initialize();
		}else{
			SQLite.initialize();
		}
	}

	static async prepare(query: string, values: any[]): Promise<any[]>{
		if(process.env.DB_TYPE === 'mariadb'){
			return await MariaDB.DB.query(query, values);
		}else if(process.env.DB_TYPE === 'mysql'){
			const [results] = await MySQL.DB.execute(query, values);
			if(Array.isArray(results)) return results;
			return [];
		}
		return SQLite.DB.prepare(query, values).all();
	}

	static async prepareModify(query: string, values: any[]): Promise<boolean>{
		if(process.env.DB_TYPE === 'mariadb'){
			let res = await MariaDB.DB.query(query, values);
			if(res.affectedRows >= 1) return true;
			return false;
		}else if(process.env.DB_TYPE === 'mysql'){
			const [results] = await MySQL.DB.execute(query, values);
			if ((results as ResultSetHeader).affectedRows > 0) return true;
			return false;
		}
		SQLite.DB.prepare(query, values).run();
		return true;
	}
}