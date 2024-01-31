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

	static async listObjects(prefix: string = '/', startAfter: string | undefined = undefined) : Promise<_Object[] | null>{
		try{
			let res = await this.S3.send(new ListObjectsV2Command({
				Bucket: process.env.S3_BUCKET_NAME,
				Delimiter: '/',
				Prefix: prefix,
				MaxKeys: 1000,
				StartAfter: startAfter
			}));

			if(res.Contents === undefined) return null;
			return res.Contents;
		}catch(err){
			Logger.error(`[S3] ${err}`);
			return null;
		}
	}
}