import DB from "../../../database/database";
import { Error } from "../../../errors";
import { jsonError } from "../../../utils";
import Validate from "../../../validate";

export default async function handleAccountCreate(req: Request): Promise<Response> {
	if (req.method !== "POST") return jsonError(Error.INVALID_ENDPOINT);
	if (process.env.ACCOUNT_CREATION === "false") return jsonError(Error.REGISTRATION_DISABLED);

	let data: any;
	try {
		data = await req.json();
	} catch {
		return jsonError(Error.REQUIRED_DATA_MISSING);
	}

	if (!Validate.username(data.username)) return jsonError(Error.INVALID_USERNAME_FORMAT);
	if (!Validate.email(data.email)) return jsonError(Error.INVALID_EMAIL);
	if (!Validate.password(data.password)) return jsonError(Error.PASSWORD_NOT_HASHED);
	if (!Validate.accountType(data.type)) return jsonError(Error.INVALID_ACCOUNT_TYPE);

	let results = await DB.prepare('SELECT * FROM "Accounts" WHERE "Username" = ?', [data.username]);
	if (results === null) return jsonError(Error.UNKNOWN_ERROR);
	if (results.length !== 0) return jsonError(Error.USERNAME_ALREADY_REGISTERED);

	data.password = await Bun.password.hash(data.password, {
		algorithm: "argon2id",
		memoryCost: 64 * 1024,
		timeCost: 1,
	});

	let timestamp = Date.now();
	let result = await DB.prepareModify(
		'INSERT INTO "Accounts"("Username","Email","Password","StorageUsed","StorageLimit","DownloadUsed","DownloadLimit","UploadUsed","UploadLimit","Type","Created","Accessed") VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
		[
			data.username,
			data.email,
			data.password,
			0,
			Number(process.env.ACCOUNT_STORAGE_LIMIT) * 1024 * 1024,
			0,
			Number(process.env.ACCOUNT_DOWNLOAD_LIMIT) * 1024 * 1024,
			0,
			Number(process.env.ACCOUNT_UPLOAD_LIMIT) * 1024 * 1024,
			Number(data.type),
			timestamp,
			timestamp,
		]
	);
	if (!result) return jsonError(Error.UNKNOWN_ERROR);

	return jsonError(Error.SUCCESS);
}
