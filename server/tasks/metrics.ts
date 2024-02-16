import Logger from "@rabbit-company/logger";
import Redis from "../database/redis";

export default class Metrics{

	static async run(){
		Logger.verbose('[METRICS] Task started');

		const totalHttpRequests = await Redis.getNumber('metrics_web_request_counter', 0);

		const openMetrics = `
		# HELP web_request_counter Total HTTP requests
		# TYPE web_request_counter counter
		web_request_counter ${totalHttpRequests}
		`.trim().replace(/\t/g, '');

		await Redis.setString('metrics_cache', openMetrics, 864000);

		Logger.silly('[METRICS] Task ended');
	}

}