import Logger from '@rabbit-company/logger';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
	type ListObjectsV2CommandOutput,
	type _Object
} from "@aws-sdk/client-s3";

export default class S3{
	static S3 = new S3Client({
		region: process.env.S3_REGION,
		endpoint: process.env.S3_ENDPOINT,
		credentials: {
			accessKeyId: process.env.S3_ACCESS_KEY || "",
			secretAccessKey: process.env.S3_SECRET_KEY || "",
		},
	});

	static async listObjects(prefix: string = '/', startAfter: string | undefined = undefined) : Promise<_Object[] | boolean | null>{
		try{
			let res = await this.S3.send(new ListObjectsV2Command({
				Bucket: process.env.S3_BUCKET_NAME,
				Delimiter: '/',
				Prefix: prefix,
				MaxKeys: 1000,
				StartAfter: startAfter
			}));

			if(res.Contents === undefined) return false;
			return res.Contents;
		}catch(err){
			Logger.error(`[S3] ${err}`);
			return null;
		}
	}

	static async listUserFiles(username: string) : Promise<_Object[] | null>{
		let files: _Object[] = [];
		let lastKey : string | undefined;
		while(true){
			let res = await this.listObjects(`data/${username}/`, lastKey);
			if(res === null) return null;
			if(res === false || res === true) break;
			files.push(...res);
			lastKey = files[files.length - 1].Key;
		}

		let ufiles = files
			.filter(file => file.Key !== undefined && file.Size !== undefined && file.LastModified !== undefined)
			.map(({ Key, LastModified, Size }) => ({
				Key: Key!.replace(`data/${username}/`, ''),
				LastModified: LastModified!,
				Size: Size!
			})
		);

    return ufiles;
	}
}