import type { ResultSetHeader } from "mysql2/promise";
import MySQL from "./mysql";
import SQLite from "./sqlite";
import MariaDB from "./mariadb";
import D1 from "./d1";
import Logger from "@rabbit-company/logger";

export namespace DB{

	export async function initialize(){
		if(process.env.DB_TYPE === 'mariadb'){
			await MariaDB.initialize();
		}else if(process.env.DB_TYPE === 'mysql'){
			await MySQL.initialize();
		}else if(process.env.DB_TYPE === 'sqlite'){
			SQLite.initialize();
		}else if(process.env.DB_TYPE === 'd1'){
			await D1.initialize();
		}else{
			Logger.error(`[DB] Unsupported database type: ${process.env.DB_TYPE}`);
			process.exit();
		}
	}

	export async function prepare(query: string, values: any[]): Promise<any[] | null>{
    try{
      if(process.env.DB_TYPE === 'mariadb'){
        const results: any[] = await MariaDB.connection.query(query, values);
        return results;
      }else if(process.env.DB_TYPE === 'mysql'){
        const [results] = await MySQL.connection.execute(query, values);
        return Array.isArray(results) ? results : [];
      }else if(process.env.DB_TYPE === 'sqlite'){
        return SQLite.connection.prepare(query, values).all();
      }else if(process.env.DB_TYPE === 'd1'){
				const res = await D1.connection.allRaw(query, values);
				return res.results;
			}else{
				Logger.error(`[DB] Unsupported database type: ${process.env.DB_TYPE}`);
				process.exit();
      }
    }catch(error){
			Logger.error('[DB] ' + error);
      return null;
    }
	}

	export async function prepareModify(query: string, values: any[]): Promise<boolean | null>{
		try{
			if(process.env.DB_TYPE === 'mariadb'){
				const res = await MariaDB.connection.query(query, values);
				return res.affectedRows > 0;
			}else if(process.env.DB_TYPE === 'mysql'){
				const [results] = await MySQL.connection.execute(query, values);
				return (results as ResultSetHeader).affectedRows > 0;
			}else if(process.env.DB_TYPE === 'sqlite'){
				SQLite.connection.prepare(query, values).run();
				return true;
			}else if(process.env.DB_TYPE === 'd1'){
				let res;
				if(values.length) res = await D1.connection.execRaw(query, values);
				else res = await D1.connection.execRaw(query);
				return res.success;
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

export default DB;