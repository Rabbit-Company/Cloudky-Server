import DB from "../../../database/database";
import Errors from "../../../errors";
import Utils from "../../../utils";
import Validate from "../../../validate";

export default async function handleAccountCreate(req: Request): Promise<Response> {
	if(req.method !== 'POST') return Utils.jsonResponse(Errors.getJson(404));
	if(process.env.ACCOUNT_CREATION === 'false') return Utils.jsonResponse(Errors.getJson(1002));

	let data: any;
	try{
		data = await req.json();
	}catch{
		return Utils.jsonResponse(Errors.getJson(1001));
	}

	if(!Validate.username(data.username)) return Utils.jsonResponse(Errors.getJson(1003));
	if(!Validate.email(data.email)) return Utils.jsonResponse(Errors.getJson(1009));
	if(!Validate.password(data.password)) return Utils.jsonResponse(Errors.getJson(1004));
	if(!Validate.accountType(data.type)) return Utils.jsonResponse(Errors.getJson(1019));

	let results = await DB.prepare('SELECT * FROM "Accounts" WHERE "Username" = ?', [data.username]);
	if(results === null) return Utils.jsonResponse(Errors.getJson(2000));
	if(results.length !== 0) return Utils.jsonResponse(Errors.getJson(1007));

	data.password = await Bun.password.hash(data.password);

	let timestamp = Math.floor(Date.now() / 1000);
	let result = await DB.prepareModify('INSERT INTO "Accounts"("Username","Email","Password","StorageUsed","StorageLimit","Type","Created","Accessed") VALUES(?,?,?,?,?,?,?,?)', [data.username, data.email, data.password, 0, Number(process.env.ACCOUNT_STORAGE_LIMIT), Number(data.type), timestamp, timestamp]);
	if(!result) return Utils.jsonResponse(Errors.getJson(2000));

	return Utils.jsonResponse(Errors.getJson(0));
}