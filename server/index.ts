import Utils from './utils.ts';
import Errors from './errors.ts';
import Logger from '@rabbit-company/logger';
import Redis from './database/redis.ts';
import DB from './database/database.ts';
import Validate from './validate.ts';
import { saveChunk, type ChunkData, buildChunks } from './chunks.ts';

await Redis.initialize();
await DB.initialize();

Logger.level = Number(process.env.LOGGER_LEVEL) || 6;

Logger.info(`Server listening on port ${process.env.SERVER_HOSTNAME}:${process.env.SERVER_PORT}`);

const router = new Bun.FileSystemRouter({
	style: 'nextjs',
	dir: './server/endpoints'
});

Bun.serve({
	port: process.env.SERVER_PORT,
	hostname: process.env.SERVER_HOSTNAME,
	development: false,
	async fetch(req, server) {
		const url = new URL(req.url);
		const path = url.pathname;
		const ip = server.requestIP(req)?.address;

		Logger.http(`${req.method} - ${ip} - ${path}`);

		// TODO: API rate limiter

		const match = router.match(path);
		if(!match) return Utils.jsonResponse(Errors.getJson(404), 404);

		const { src } = match;

		try{
			const module = await import('./endpoints/' + src);
			return await module.default(req, match, ip);
		}catch(err){
			Logger.error(`[GENERAL] ${err}`);
			return Utils.jsonResponse(Errors.getJson(2000), 500);
		}
	}
});

if(process.env.S3_ENABLED !== 'true'){

	type WebSocketData = {
		username: string;
		token: string;
		chunkData: ChunkData
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

			if(!Validate.username(username)) return Utils.jsonResponse(Errors.getJson(1012));
			if(!Validate.token(token)) return Utils.jsonResponse(Errors.getJson(1016));
			if(!Validate.uuid(uploadID)) return Utils.jsonResponse(Errors.getJson(1020));
			if(!Validate.userFilePathName(path)) return Utils.jsonResponse(Errors.getJson(1005));

			let hashedIP = await Utils.generateHash(ip || '', 'sha256');
			let token2 = await Redis.getString(`token_${username}_${hashedIP}`);
			if(!Validate.token(token2)) return Utils.jsonResponse(Errors.getJson(1017));
			if(token !== token2) return Utils.jsonResponse(Errors.getJson(1017));

			let chunkData: ChunkData = {
				owner: username as string,
				uploadID: uploadID as string,
				path: path as string,
				chunks: [],
				completed: new Set(),
				size: 0,
				created: Date.now()
			}

			let data: WebSocketData = {
				username: username as string,
				token: token as string,
				chunkData: chunkData
			}

			if(server.upgrade(req, { data })) return;

			return Utils.jsonResponse(Errors.getJson(2000), 500);
		},
		websocket: {
			idleTimeout: 120,
			maxPayloadLength: 1024 * 1024 * 50,
			sendPings: true,
			publishToSelf: false,
			async message(ws, message){
				if(typeof message === 'string'){
					try{
						let data = JSON.parse(message);
						if(!Validate.chunks(data.chunks)) return;
						ws.data.chunkData.chunks = data.chunks;
						ws.sendText(JSON.stringify({ chunks: ws.data.chunkData.chunks, completed: Array.from(ws.data.chunkData.completed), size: ws.data.chunkData.size }));
					}catch{}
					return;
				}

				await saveChunk(ws.data.chunkData, message);
				await buildChunks(ws.data.chunkData);
				ws.sendText(JSON.stringify({ chunks: ws.data.chunkData.chunks, completed: Array.from(ws.data.chunkData.completed), size: ws.data.chunkData.size }));
			}
		}
	});
}