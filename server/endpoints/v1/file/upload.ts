import type { MatchedRoute } from "bun";
import Errors from "../../../errors";
import Utils from "../../../utils";
import Validate from "../../../validate";
import Redis from "../../../database/redis";
import Storage from "../../../storage/storage";

export default async function handleFileUpload(req: Request, match: MatchedRoute | null, ip: string | undefined): Promise<Response> {
	if(req.method !== 'POST') return Utils.jsonResponse(Errors.getJson(404));

	const contentLength = req.headers.get('Content-Length');
	if(contentLength && parseInt(contentLength, 10) > 53_687_091_200) {
    return Utils.jsonResponse(Errors.getJson(1010));
  }

	const auth = Utils.basicAuthentication(req);
	if(auth === null) return Utils.jsonResponse(Errors.getJson(1018));

	if(!Validate.username(auth.user)) return Utils.jsonResponse(Errors.getJson(1012));
	if(!Validate.token(auth.pass)) return Utils.jsonResponse(Errors.getJson(1016));

	let hashedIP = await Utils.generateHash(ip || '', 'sha256');
	let token = await Redis.getString(`token_${auth.user}_${hashedIP}`);
	if(!Validate.token(token)) return Utils.jsonResponse(Errors.getJson(1017));
	if(auth.pass !== token) return Utils.jsonResponse(Errors.getJson(1017));

	const formdata = await req.formData();
	const key = formdata.get('name')?.toString();
	const file = formdata.get('file');

	if(!Validate.userFilePathName(key)) return Utils.jsonResponse(Errors.getJson(1005));
	if(!(file instanceof File) || file.size === undefined) {
    return Utils.jsonResponse(Errors.getJson(1006));
  }

	const fileSizeInBytes = file.size || 0;
	const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

	// 50GB max file size
	if(fileSizeInMB > 51_200){
		return Utils.jsonResponse(Errors.getJson(1010));
	}

	let res = await Storage.uploadUserFile(auth.user, key!, file);
	if(res === null) return Utils.jsonResponse(Errors.getJson(2000));

	return Utils.jsonResponse({ 'error': 0, 'info': 'Success' });
}