import Logger from "@rabbit-company/logger";
import Redis from "./database/redis.ts";
import DB from "./database/database.ts";
import Scheduler from "./scheduler.ts";
import Validate from "./validate.ts";
import { saveChunk, type ChunkData, buildChunks } from "./chunks.ts";
import Metrics from "./metrics.ts";
import { generateHash, jsonError } from "./utils.ts";

await Redis.initialize();
await DB.initialize();
await Scheduler.initialize();

Metrics.initialize();

Logger.level = Number(process.env.LOGGER_LEVEL) || 3;

Logger.info(`Server listening on port ${process.env.SERVER_HOSTNAME}:${process.env.SERVER_PORT}`);

const router = new Bun.FileSystemRouter({
	style: "nextjs",
	dir: "./server/endpoints",
});

export const httpServer = Bun.serve({
	port: process.env.SERVER_PORT,
	hostname: process.env.SERVER_HOSTNAME,
	development: false,
	async fetch(req, server) {
		const url = new URL(req.url);
		const path = url.pathname;
		const ip = server.requestIP(req)?.address;

		Logger.http(`${req.method} - ${ip} - ${path}`);

		if (Number(process.env.METRICS_TYPE) >= 1) {
			Metrics.http_requests_total.labels(req.method, path).inc();
		}

		if (req.method === "OPTIONS") {
			let response = new Response();
			response.headers.set("Access-Control-Allow-Origin", "*");
			response.headers.set("Access-Control-Allow-Headers", "*");
			response.headers.set("Access-Control-Allow-Credentials", "true");
			response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
			response.headers.set("Access-Control-Max-Age", "86400");
			return response;
		}

		// TODO: API rate limiter

		const start = process.hrtime();
		const match = router.match(path);
		if (!match) return jsonError(404);

		const { src } = match;

		try {
			const module = await import("./endpoints/" + src);
			const res = await module.default(req, match, ip);

			const end = process.hrtime(start);
			if (Number(process.env.METRICS_TYPE) >= 2) {
				Metrics.http_request_duration.labels(path).observe(end[0] * 1000 + end[1] / 1000000);
			}

			res.headers.set("Access-Control-Allow-Origin", "*");
			res.headers.set("Access-Control-Allow-Headers", "*");
			res.headers.set("Access-Control-Allow-Credentials", "true");
			res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
			res.headers.set("Access-Control-Max-Age", "86400");

			return res;
		} catch (err) {
			Logger.error(`[GENERAL] ${err}`);
			return jsonError(2000);
		}
	},
});

if (process.env.S3_ENABLED !== "true") {
	type WebSocketData = {
		username: string;
		token: string;
		chunkData: ChunkData;
	};

	Logger.info(`WebSocket listening on port ${process.env.SERVER_HOSTNAME}:${process.env.WEBSOCKET_PORT}`);

	Bun.serve<WebSocketData>({
		port: process.env.WEBSOCKET_PORT,
		hostname: process.env.SERVER_HOSTNAME,
		development: false,
		async fetch(req, server) {
			const url = new URL(req.url);
			const ip = server.requestIP(req)?.address;

			const username = url.searchParams.get("username");
			const token = url.searchParams.get("token");
			const uploadID = url.searchParams.get("uploadID");
			const path = url.searchParams.get("path");

			Logger.http(`WebSocket - ${ip} - ${username}`);

			if (!Validate.username(username)) return jsonError(1012);
			if (!Validate.token(token)) return jsonError(1016);
			if (!Validate.uuid(uploadID)) return jsonError(1020);
			if (!Validate.userFilePathName(path)) return jsonError(1005);

			let hashedIP = await generateHash(ip || "", "sha256");
			let token2 = await Redis.getString(`token_${username}_${hashedIP}`);
			if (!Validate.token(token2)) return jsonError(1017);
			if (token !== token2) return jsonError(1017);

			let chunkData: ChunkData = {
				owner: username as string,
				uploadID: uploadID as string,
				path: path as string,
				chunks: [],
				completed: new Set(),
				size: 0,
				created: Date.now(),
			};

			let data: WebSocketData = {
				username: username as string,
				token: token as string,
				chunkData: chunkData,
			};

			if (server.upgrade(req, { data })) return;

			return jsonError(2000);
		},
		websocket: {
			idleTimeout: 120,
			maxPayloadLength: 1024 * 1024 * 50,
			sendPings: true,
			publishToSelf: false,
			async message(ws, message) {
				if (typeof message === "string") {
					try {
						let data = JSON.parse(message);
						if (!Validate.chunks(data.chunks)) return;
						ws.data.chunkData.chunks = data.chunks;
					} catch {}
					ws.sendText(JSON.stringify({ chunks: ws.data.chunkData.chunks, completed: Array.from(ws.data.chunkData.completed), size: ws.data.chunkData.size }));
					return;
				}

				await saveChunk(ws.data.chunkData, message);
				await buildChunks(ws.data.chunkData);
				ws.sendText(JSON.stringify({ chunks: ws.data.chunkData.chunks, completed: Array.from(ws.data.chunkData.completed), size: ws.data.chunkData.size }));
			},
		},
	});
}
