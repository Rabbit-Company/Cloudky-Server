import { Glob } from "bun";
import {
	type _Object
} from "@aws-sdk/client-s3";
import type { FileInformation } from './storage';
import type { BunFile } from 'bun';
import { unlink } from 'fs/promises';

export default class LocalStorage{

	static async listUserFiles(username: string): Promise<FileInformation[]>{
		try{
			const glob = new Glob("**");
			const path = `${process.env.DATA_DIRECTORY}/data/${username}/`;

			let files: FileInformation[] = [];
			for await (const fileName of glob.scan({cwd: path, dot: true, onlyFiles: true, absolute: false})) {
				let file = Bun.file(`${path}/${fileName}`);
				files.push({
					Key: fileName,
					Modified: file.lastModified,
					Size: file.size
				});
			}

			return files;
		}catch{
			return [];
		}
	}

	static async uploadUserFile(username: string, key: string, body: any): Promise<boolean>{
		try{
			await Bun.write(`${process.env.DATA_DIRECTORY}/data/${username}/${key}`, body, { createPath: true });
			return true;
		}catch{
			return false;
		}
	}

	static async downloadUserFile(username: string, key: string): Promise<BunFile | null>{
		try{
			let file = Bun.file(`${process.env.DATA_DIRECTORY}/data/${username}/${key}`);
			if(!await file.exists()) return null;
			return file;
		}catch{
			return null;
		}
	}

	static async deleteUserFiles(username: string, keys: string[]): Promise<boolean>{
		try{
			keys.forEach(async key => {
				let path = `${process.env.DATA_DIRECTORY}/data/${username}/${key}`;
				if(await Bun.file(path).exists()) await unlink(path);
			});
			return true;
		}catch{
			return false;
		}
	}
}