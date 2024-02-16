import TaskMetrics from "./tasks/metrics";

export default class Scheduler{

	static async initialize(){
		if(Number(process.env.METRICS_TYPE) >= 1) setInterval(() => TaskMetrics.run(), Number(process.env.SCHEDULER_METRICS_INTERVAL)*1000);
	}

}