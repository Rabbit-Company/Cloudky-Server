import Logger from '@rabbit-company/logger';
import IORedis from "ioredis";

export default class Redis{
	static localCache: IORedis = new IORedis(process.env.REDIS_LOCAL || "redis://localhost/", { connectTimeout: 500, commandTimeout: 500 });
	static externalCache: IORedis = new IORedis(process.env.REDIS_EXTERNAL || "redis://localhost/", { connectTimeout: 2000, commandTimeout: 2000 });

	static async initialize(){
		Redis.localCache.on('error', () => {
			Logger.error('[REDIS] Local Redis connection error!');
		});
    Redis.externalCache.on('error', () => {
			Logger.error('[REDIS] External Redis connection error!');
		});
	}

	static async getString(key: string, localTTL: number = 0): Promise<string | null>{
		try{
			let localValue = await Redis.localCache.get(key);
			if(localValue !== null) return localValue;

			let externalValue = await Redis.externalCache.get(key);
			if(externalValue !== null){
				if(localTTL !== 0) await Redis.localCache.set(key, externalValue, 'EX', localTTL);
				return externalValue;
			}

			return null;
		}catch{
			Logger.error('[REDIS] Connection error!');
			return null;
		}
	}

	static async setString(key: string, value: string, localTTL: number = 0, externalTTL: number = 0): Promise<boolean | null>{
		try{
			if(localTTL !== 0) await Redis.localCache.set(key, value, 'EX', localTTL);
			if(externalTTL !== 0) await Redis.externalCache.set(key, value, 'EX', externalTTL);
			return true;
		}catch{
			Logger.error('[REDIS] Connection error!');
			return null;
		}
	}

	static async increase(key: string, local: boolean = true, external: boolean = false): Promise<number | null>{
		try{
			let number = 0;

			if(local) number = await Redis.localCache.incr(key);
			if(external) number = await Redis.externalCache.incr(key);

			return number;
		}catch{
			Logger.error('[REDIS] Connection error!');
			return null;
		}
	}

	static async getNumber(key: string, defaultNumber: number = 0): Promise<number>{
		return Number.parseInt(await Redis.getString(key) || defaultNumber.toString(), 10) || defaultNumber;
	}

	static async deleteString(key: string): Promise<boolean | null>{
		try{
			await Redis.localCache.del(key);
			await Redis.externalCache.del(key);
			return true;
		}catch{
			Logger.error('[REDIS] Connection error!');
			return null;
		}
	}

	static async getOrSetString(key: string, value: string, localTTL: number = 0, externalTTL: number = 0): Promise<string | null>{
		try{
			if(localTTL !== 0){
				let localValue = await Redis.localCache.get(key);
				if(localValue !== null) return localValue;
			}

			if(externalTTL !== 0){
				let externalValue = await Redis.externalCache.get(key);
				if(externalValue !== null){
					if(localTTL !== 0) await Redis.localCache.set(key, externalValue, 'EX', localTTL);
					return externalValue;
				}
			}

			if(localTTL !== 0) await Redis.localCache.set(key, value, 'EX', localTTL);
			if(externalTTL !== 0) await Redis.externalCache.set(key, value, 'EX', externalTTL);
			return value;
		}catch{
			Logger.error('[REDIS] Connection error!');
			return null;
		}
	}

}