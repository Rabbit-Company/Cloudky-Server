import Logger from "@rabbit-company/logger";
import Redis from "../database/redis";
import * as Prometheus from 'prom-client';
import Metrics from "../metrics";
import { httpServer } from "..";

export default class TaskMetrics{

	static async run(){
		Logger.silly('[METRICS] Task started');
		Metrics.http_concurrent_requests_total.set(httpServer.pendingRequests);
		await Redis.setString('metrics_cache', await Prometheus.register.metrics(), 864000);
		Logger.silly('[METRICS] Task ended');
	}

}