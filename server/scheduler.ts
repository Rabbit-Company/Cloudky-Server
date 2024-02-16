import Metrics from "./tasks/metrics";

export default class Scheduler{

	static async initialize(){
		if(Number(process.env.METRICS_TYPE) >= 1) await Metrics.initialize();
		if(Number(process.env.METRICS_TYPE) >= 1) setInterval(() => Metrics.run(), Number(process.env.SCHEDULER_METRICS_INTERVAL)*1000);
	}

}