import type { MatchedRoute } from "bun";
import Redis from "../database/redis";
import { register } from "prom-client";
import { getBearerToken, jsonError } from "../utils";

export default async function handleMetrics(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'GET' || Number(process.env.METRICS_TYPE) < 1) return jsonError(404);

	const token = process.env.METRICS_TOKEN;
	if(token !== 'none'){
		const bearer = getBearerToken(req);
		if(bearer === null) return jsonError(1000);
		if(bearer !== token) return jsonError(1008);
	}

	return new Response(await Redis.getString(`metrics_cache`), { headers: { "Content-Type": register.contentType }});
}