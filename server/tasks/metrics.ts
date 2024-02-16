import Logger from "@rabbit-company/logger";
import Redis from "../database/redis";
import * as Prometheus from 'prom-client';

export default class Metrics{

	static async run(){
		Logger.silly('[METRICS] Task started');
		await Redis.setString('metrics_cache', await Prometheus.register.metrics(), 864000);
		Logger.silly('[METRICS] Task ended');
	}

}