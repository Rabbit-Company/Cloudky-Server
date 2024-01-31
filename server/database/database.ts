import type { ResultSetHeader } from "mysql2/promise";
import MySQL from "./mysql";
import SQLite from "./sqlite";
import MariaDB from "./mariadb";
import Logger from "@rabbit-company/logger";

export default class DB{

	static async initialize(){
		if(process.env.DB_TYPE === 'mariadb'){
			await MariaDB.initialize();
		}else if(process.env.DB_TYPE === 'mysql'){
			await MySQL.initialize();
		}else if(process.env.DB_TYPE === 'sqlite'){
			SQLite.initialize();
		}else{
			Logger.error(`[DB] Unsupported database type: ${process.env.DB_TYPE}`);
			process.exit();
		}
	}

	static async prepare(query: string, values: any[]): Promise<any[] | null>{
    try{
      if(process.env.DB_TYPE === 'mariadb'){
        const results: any[] = await MariaDB.DB.query(query, values);
        return results;
      }else if(process.env.DB_TYPE === 'mysql'){
        const [results] = await MySQL.DB.execute(query, values);
        return Array.isArray(results) ? results : [];
      }else if(process.env.DB_TYPE === 'sqlite'){
        return SQLite.DB.prepare(query, values).all();
      }else{
				Logger.error(`[DB] Unsupported database type: ${process.env.DB_TYPE}`);
				process.exit();
      }
    }catch(error){
			Logger.error('[DB] ' + error);
      return null;
    }
	}

	static async prepareModify(query: string, values: any[]): Promise<boolean | null>{
		try{
			if(process.env.DB_TYPE === 'mariadb'){
				const res = await MariaDB.DB.query(query, values);
				return res.affectedRows > 0;
			}else if(process.env.DB_TYPE === 'mysql'){
				const [results] = await MySQL.DB.execute(query, values);
				return (results as ResultSetHeader).affectedRows > 0;
			}else if(process.env.DB_TYPE === 'sqlite'){
				SQLite.DB.prepare(query, values).run();
				return true;
			}else{
				Logger.error(`[DB] Unsupported database type: ${process.env.DB_TYPE}`);
				process.exit();
			}
		}catch(error){
			Logger.error('[DB] ' + error);
      return null;
		}
	}
}