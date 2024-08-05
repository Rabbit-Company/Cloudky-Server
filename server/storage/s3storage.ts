import Logger from '@rabbit-company/logger';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
	type _Object,
	CreateMultipartUploadCommand,
	UploadPartCommand,
	CompleteMultipartUploadCommand,
	PutObjectCommand,
	DeleteObjectsCommand
} from "@aws-sdk/client-s3";
import type { FileInformation } from './storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import DB from '../database/database';

export namespace S3{

	export const S3 = new S3Client({
		region: process.env.S3_REGION,
		endpoint: process.env.S3_ENDPOINT,
		credentials: {
			accessKeyId: process.env.S3_ACCESS_KEY || "",
			secretAccessKey: process.env.S3_SECRET_KEY || "",
		},
	});

	export async function listObjects(prefix: string = '/', startAfter: string | undefined = undefined) : Promise<_Object[] | boolean | null>{
		try{
			let res = await S3.send(new ListObjectsV2Command({
				Bucket: process.env.S3_BUCKET_NAME,
				Delimiter: '/',
				Prefix: prefix,
				MaxKeys: 1000,
				StartAfter: startAfter
			}));

			if(!res.Contents) return false;
			return res.Contents;
		}catch(err){
			Logger.error(`[S3] ${err}`);
			return null;
		}
	}

	export async function userFileExists(username: string, key: string): Promise<boolean | null>{
		try{
			let results = await DB.prepare('SELECT * FROM "Files" WHERE "Username" = ? AND "Path" = ?', [username, key]);
			return results !== null && results.length > 0;
		}catch(err){
			Logger.error(`[S3] ${err}`);
			return null;
		}
	}

	export async function deleteObjects(keys: string[]): Promise<boolean>{
		try{
			let res = await S3.send(new DeleteObjectsCommand({
				Bucket: process.env.S3_BUCKET_NAME,
				Delete: {
					Objects: keys.map((key) => { return {Key: key }; })
				}
			}));
			if(!res.Deleted) return false;
			return true;
		}catch(err){
			Logger.error(`[S3] ${err}`);
			return false;
		}
	}

	export async function getObjectLink(key: string, expiresIn: number = 3600): Promise<string | null>{
		try{
			return await getSignedUrl(S3, new GetObjectCommand({
				Bucket: process.env.S3_BUCKET_NAME,
				Key: key
			}), { expiresIn: expiresIn });
		}catch(err){
			Logger.error(`[S3] ${err}`);
			return null;
		}
	}

	export async function putObjectLink(key: string, expiresIn: number = 3600): Promise<string | null>{
		try{
			return await getSignedUrl(S3, new PutObjectCommand({
				Bucket: process.env.S3_BUCKET_NAME,
				Key: key
			}), { expiresIn: expiresIn });
		}catch(err){
			Logger.error(`[S3] ${err}`);
			return null;
		}
	}

	export async function getObjectMultipartUploadLink(key: string, expiresIn: number = 3600): Promise<string | null>{
		try{
			return await getSignedUrl(S3, new CreateMultipartUploadCommand({
				Bucket: process.env.S3_BUCKET_NAME,
				Key: key
			}), { expiresIn: expiresIn });
		}catch(err){
			Logger.error(`[S3] ${err}`);
			return null;
		}
	}

	export async function putObject(key: string, body: any) : Promise<boolean | null>{
		try{
			const createMultipartUpload = await S3.send(new CreateMultipartUploadCommand({
				Bucket: process.env.S3_BUCKET_NAME,
				Key: key
			}));
    	const uploadId = createMultipartUpload.UploadId;

			const partSize = 5 * 1024 * 1024;
			const totalParts = Math.ceil(body.length / partSize);

			const uploadPromises = [];
			for (let i = 0; i < totalParts; i++) {
				const start = i * partSize;
				const end = Math.min(start + partSize, body.length);

				const uploadPartPromise = S3.send(new UploadPartCommand({
					Bucket: process.env.S3_BUCKET_NAME,
					Key: key,
					PartNumber: i + 1,
					UploadId: uploadId,
					Body: body.slice(start, end),
				}));

				uploadPromises.push(uploadPartPromise);
			}
			const uploadPartResponses = await Promise.all(uploadPromises);

			const parts = uploadPartResponses.map((response, index) => ({
				ETag: response.ETag,
				PartNumber: index + 1,
			}));

			await S3.send(new CompleteMultipartUploadCommand({
				Bucket: process.env.S3_BUCKET_NAME,
				Key: key,
				UploadId: uploadId,
				MultipartUpload: { Parts: parts },
			}));

			return true;
		}catch(err){
			Logger.error(`[S3] ${err}`);
			return null;
		}
	}

	export async function listUserFiles(username: string) : Promise<FileInformation[] | null>{
		let files: _Object[] = [];
		let lastKey : string | undefined;
		while(true){
			let res = await listObjects(`data/${username}/`, lastKey);
			if(res === null) return null;
			if(res === false || res === true) break;
			files.push(...res);
			lastKey = files[files.length - 1].Key;
		}

		let ufiles = files
			.filter(file => file.Key !== undefined && file.Size !== undefined && file.LastModified !== undefined)
			.map(({ Key, LastModified, Size }) => ({
				Key: Key!.replace(`data/${username}/`, ''),
				Modified: new Date(LastModified!).getTime(),
				Size: Size!
			})
		);

    return ufiles;
	}

	export async function deleteUserFiles(username: string, keys: string[]): Promise<boolean>{
		return await deleteObjects(keys.map(key => `data/${username}/${key}`));
	}

	export async function uploadUserFile(username: string, key: string, body: any): Promise<boolean | null>{
		return await putObject(`data/${username}/${key}`, body);
	}

	export async function getUserObjectLink(username: string, key: string): Promise<string | null>{
		return await getObjectLink(`data/${username}/${key}`, 43200);
	}

	export async function getUserMultipartUploadLink(username: string, key: string): Promise<string | null>{
		return await getObjectMultipartUploadLink(`data/${username}/${key}`, 43200);
	}
}

export default S3;