import Utils from './utils.ts';
import Errors from './errors.ts';
import Logger from '@rabbit-company/logger';
import Redis from './database/redis.ts';
import SQLite from './database/sqlite.ts';

Redis.initialize();
SQLite.initialize();

Logger.level = Number(process.env.LOGGER_LEVEL) || 6;

Logger.info(`Server listening on port ${process.env.SERVER_HOSTNAME}:${process.env.SERVER_PORT}`);

const router = new Bun.FileSystemRouter({
	style: 'nextjs',
	dir: './server/endpoints'
});

Bun.serve({
	port: process.env.SERVER_PORT,
	hostname: process.env.SERVER_HOSTNAME,
	development: true,
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
		}catch{
			return Utils.jsonResponse({}, 500);
		}
	}
});