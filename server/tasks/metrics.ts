import Logger from "@rabbit-company/logger";
import Redis from "../database/redis";

export default class Metrics{

	static async initialize(){
		const data = await this.getSavedMetrics({'http_requests_total': 0});

		Object.keys(data).forEach(async key => {
			await Redis.setString(`metrics_${key}`, data[key], 864000);
		});
	}

	static async run(){
		Logger.verbose('[METRICS] Task started');

		const totalHttpRequests = await Redis.getNumber('metrics_http_requests_total', 0);

		const data = {
			'http_requests_total': totalHttpRequests
		};

		const openMetrics = `
		# HELP cloudky_http_requests_total Total HTTP requests
		# TYPE cloudky_http_requests_total counter
		cloudky_http_requests_total ${totalHttpRequests}
		`.trim().replace(/\t/g, '');

		try{
			await Redis.setString('metrics_cache', openMetrics, 864000);

			const metrics = await this.getSavedMetrics(data);
			if(totalHttpRequests !== 0 && metrics['http_requests_total'] <= totalHttpRequests){
				await Bun.write(`${process.env.METADATA_DIRECTORY}/metrics.json`, JSON.stringify(data), { createPath: true });
			}else{
				await this.initialize();
			}
		}catch{
			Logger.error('[METRICS] Saving data!');
		}

		Logger.silly('[METRICS] Task ended');
	}

	static async getSavedMetrics(data: any){
		const path = `${process.env.METADATA_DIRECTORY}/metrics.json`;
		try{
			const file = Bun.file(path);
			if(!(await file.exists())) await Bun.write(path, JSON.stringify(data), { createPath: true });
			return (await file.json());
		}catch{
			Logger.error('[METRICS] Getting data from metrics.json file!');
			return {};
		}
	}

}