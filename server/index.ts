import Utils from './utils.ts';
import Errors from './errors.ts';
import Logger from '@rabbit-company/logger';
import Redis from './database/redis.ts';
import DB from './database/database.ts';
import Validate from './validate.ts';
import Blake2b from '@rabbit-company/blake2b';

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

	interface Chunk{
		number: number,
		hash: string
	}

	type WebSocketData = {
		username: string;
		token: string;
		uploadID: string;
		path: string;
		chunks: Chunk[];
		completed: Chunk[];
		created: number;
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

			let data: WebSocketData = {
				username: username as string,
				token: token as string,
				uploadID: uploadID as string,
				path: path as string,
				chunks: [],
				completed: [],
				created: Date.now()
			}

			if(server.upgrade(req, { data })) return;

			return Utils.jsonResponse(Errors.getJson(2000), 500);
		},
		websocket: {
			idleTimeout: 120,
			maxPayloadLength: 1024 * 1024 * 100,
			sendPings: true,
			publishToSelf: false,
			async message(ws, message){
				if(typeof message === 'string'){
					try{
						let data = JSON.parse(message);
						if(!Validate.chunks(data.chunks)){
							ws.send(JSON.stringify(Utils.jsonResponse(Errors.getJson(1001))));
							return;
						}
						ws.data.chunks = data.chunks;
						ws.send(JSON.stringify({ error: '6000', info: 'Chucks successfully saved' }));
					}catch{
						ws.send(JSON.stringify(Utils.jsonResponse(Errors.getJson(1001))));
					}
					return;
				}

				let hash = Blake2b.hash(message, '');
				try{
					if(ws.data.chunks.some(chunk => chunk.hash === hash)){
						await Bun.write(`${process.env.DATA_DIRECTORY}/tmp/${ws.data.username}/${ws.data.uploadID}/${hash}`, message, { createPath: true });
						ws.send(JSON.stringify({ error: '5000', info: 'Chuck successfully uploaded', chunk: hash }));
					}else{
						ws.send(JSON.stringify({ error: '5001', info: 'Received chunk does not exists', chunk: hash }));
					}
				}catch{
					ws.send(JSON.stringify({ error: '5002', info: 'Error while processing chunk', chunk: hash }));
				}
			}
		}
	});
}