import {
	type _Object
} from "@aws-sdk/client-s3";
import S3 from './s3storage';
import LocalStorage from './localstorage';

export interface FileInformation {
  Key: string;
	Modified: number;
  Size: number;
}

export namespace Storage{

	export async function listUserFiles(username: string): Promise<FileInformation[] | null>{
		if(process.env.S3_ENABLED === 'true'){
			return await S3.listUserFiles(username);
		}
		return await LocalStorage.listUserFiles(username);
	}

	export async function moveUserFiles(username: string, keys: string[], destination: string){
		if(process.env.S3_ENABLED === 'true'){
			return false;
		}
		return await LocalStorage.moveUserFiles(username, keys, destination);
	}

	export async function deleteUserFiles(username: string, keys: string[]){
		if(process.env.S3_ENABLED === 'true'){
			return await S3.deleteUserFiles(username, keys);
		}
		return await LocalStorage.deleteUserFiles(username, keys);
	}

	export async function uploadUserFile(username: string, key: string, body: any): Promise<boolean | null>{
		if(process.env.S3_ENABLED === 'true'){
			return await S3.uploadUserFile(username, key, body);
		}
		return await LocalStorage.uploadUserFile(username, key, body);
	}

	export async function userFileExists(username: string, key: string): Promise<boolean | null>{
		if(process.env.S3_ENABLED === 'true'){
			return await S3.userFileExists(username, key);
		}
		return await LocalStorage.userFileExists(username, key);
	}

	export function calculateStorageUsage(files: FileInformation[]): number{
		let storageUsed = 0;
		files.forEach(file => {
			storageUsed += file.Size;
		});
		return storageUsed / (1024 * 1024);
	}
}

export default Storage;