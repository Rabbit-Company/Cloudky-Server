import DB from "../../../database/database";
import Utils from "../../../utils";
import Validate from "../../../validate";

export default async function handleAccountCreate(req: Request): Promise<Response> {
	if(req.method !== 'POST') return Utils.jsonError(404);
	if(process.env.ACCOUNT_CREATION === 'false') return Utils.jsonError(1002);

	let data: any;
	try{
		data = await req.json();
	}catch{
		return Utils.jsonError(1001);
	}

	if(!Validate.username(data.username)) return Utils.jsonError(1003);
	if(!Validate.email(data.email)) return Utils.jsonError(1009);
	if(!Validate.password(data.password)) return Utils.jsonError(1004);
	if(!Validate.accountType(data.type)) return Utils.jsonError(1019);

	let results = await DB.prepare('SELECT * FROM "Accounts" WHERE "Username" = ?', [data.username]);
	if(results === null) return Utils.jsonError(2000);
	if(results.length !== 0) return Utils.jsonError(1007);

	data.password = await Bun.password.hash(data.password, {
		algorithm: 'argon2id',
		memoryCost: 64*1024,
		timeCost: 1
	});

	let timestamp = Date.now();
	let result = await DB.prepareModify('INSERT INTO "Accounts"("Username","Email","Password","StorageUsed","StorageLimit","DownloadUsed","DownloadLimit","UploadUsed","UploadLimit","Type","Created","Accessed") VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', [data.username, data.email, data.password, 0, Number(process.env.ACCOUNT_STORAGE_LIMIT), 0, Number(process.env.ACCOUNT_DOWNLOAD_LIMIT), 0, Number(process.env.ACCOUNT_UPLOAD_LIMIT), Number(data.type), timestamp, timestamp]);
	if(!result) return Utils.jsonError(2000);

	return Utils.jsonResponse({ 'error': 0, 'info': 'Success' });
}