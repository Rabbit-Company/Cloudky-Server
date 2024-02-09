import type { MatchedRoute } from "bun";
import Errors from "../../../errors";
import Utils from "../../../utils";
import Validate from "../../../validate";
import Redis from "../../../database/redis";
import Storage from "../../../storage/storage";
import S3 from "../../../storage/s3storage";

export default async function handleFileUpload(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {

	const auth = Utils.basicAuthentication(req);
	if(auth === null) return Utils.jsonResponse(Errors.getJson(1018));

	if(!Validate.username(auth.user)) return Utils.jsonResponse(Errors.getJson(1012));
	if(!Validate.token(auth.pass)) return Utils.jsonResponse(Errors.getJson(1016));

	let hashedIP = await Utils.generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if(!Validate.token(token)) return Utils.jsonResponse(Errors.getJson(1017));
	if(auth.pass !== token) return Utils.jsonResponse(Errors.getJson(1017));

	if(req.method === 'POST' && process.env.S3_ENABLED === 'true'){
		return await s3FileUpload(req, auth.user);
	}else if(req.method === 'PUT' && process.env.S3_ENABLED !== 'true'){
		return await localFileUpload(req, auth.user);
	}else{
		return Utils.jsonResponse(Errors.getJson(404));
	}
}

async function s3FileUpload(req: Request, username: string): Promise<Response>{
	let data: any;
	try{
		data = await req.json();
	}catch{
		return Utils.jsonResponse(Errors.getJson(1001));
	}

	if(!Validate.userFilePathName(data.path)) return Utils.jsonResponse(Errors.getJson(1005));

	let res = await S3.getUserMultipartUploadLink(username, data.path);
	if(res === null) return Utils.jsonResponse(Errors.getJson(2000));
	return Utils.jsonResponse({ 'error': 0, 'info': 'Success', 'link': res });
}

async function localFileUpload(req: Request, username: string): Promise<Response>{
	const contentLength = req.headers.get('Content-Length');
	if(contentLength && parseInt(contentLength, 10) > 53_687_091_200) {
    return Utils.jsonResponse(Errors.getJson(1010));
  }

	const formdata = await req.formData();
	const key = formdata.get('name')?.toString();
	const file = formdata.get('file');

	if(!Validate.userFilePathName(key)) return Utils.jsonResponse(Errors.getJson(1005));
	if(!(file instanceof File) || file.size === 0) {
    return Utils.jsonResponse(Errors.getJson(1006));
  }

	const fileSizeInBytes = file.size || 0;
	const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

	// 50GB max file size
	if(fileSizeInMB > 51_200){
		return Utils.jsonResponse(Errors.getJson(1010));
	}

	let res = await Storage.uploadUserFile(username, key!, file);
	if(res === null) return Utils.jsonResponse(Errors.getJson(2000));

	await Redis.deleteString(`filelist_${username}`);

	return Utils.jsonResponse({ 'error': 0, 'info': 'Success' });
}