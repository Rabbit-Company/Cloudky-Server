import Logger from '@rabbit-company/logger';
import {
	type _Object
} from "@aws-sdk/client-s3";
import S3 from './s3storage';
import LocalStorage from './localstorage';

export interface FileInformation {
  Key: string;
  LastModified: string;
  Size: number;
}

export default class Storage{

	static async listUserFiles(username: string): Promise<FileInformation[] | null>{
		if(process.env.S3_ENABLED === 'true'){
			return await S3.listUserFiles(username);
		}
		return LocalStorage.listUserFiles(username);
	}

	static async uploadUserFile(username: string, key: string, body: any): Promise<boolean | null>{
		if(process.env.S3_ENABLED === 'true'){
			return await S3.uploadUserFile(username, key, body);
		}
		return LocalStorage.uploadUserFile(username, key, body);
	}

	static calculateStorageUsage(files: FileInformation[]): number{
		let storageUsed = 0;
		files.forEach(file => {
			storageUsed += file.Size;
		});
		return storageUsed / (1024 * 1024);
	}
}