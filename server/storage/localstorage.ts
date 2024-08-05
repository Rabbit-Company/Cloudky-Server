import { Glob } from "bun";
import {
	type _Object
} from "@aws-sdk/client-s3";
import type { FileInformation } from './storage';
import type { BunFile } from 'bun';
import { mkdir, unlink, rename, readdir, rm } from 'fs/promises';
import path from 'node:path';

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

	static async userFileExists(username: string, key: string): Promise<boolean | null>{
		try{
			return await Bun.file(`${process.env.DATA_DIRECTORY}/data/${username}/${key}`).exists();
		}catch{
			return null;
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

	static async moveUserFiles(username: string, keys: string[], destination: string): Promise<boolean>{
		try{
			destination = `${process.env.DATA_DIRECTORY}/data/${username}/${destination}`;
			await mkdir(destination, { recursive: true });
			for(let i = 0; i < keys.length; i++){
				let file = `${process.env.DATA_DIRECTORY}/data/${username}/${keys[i]}`;
				await rename(file, `${destination}/${path.basename(file)}`);
			}
			return true;
		}catch{
			return false;
		}
	}

	static async deleteUserFiles(username: string, keys: string[]): Promise<boolean>{
		try{
			const dirPath = `${process.env.DATA_DIRECTORY}/data/${username}`;

			await Promise.all(keys.map(async key => {
				const filePath = `${dirPath}/${key}`;
				if (await Bun.file(filePath).exists()) await unlink(filePath);

				const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));

				let numOfFiles = 0;
				const glob = new Glob("**");
				for await (const fileName of glob.scan({cwd: parentDir, dot: true, onlyFiles: true, absolute: false})) {
					if(!fileName.includes('.DS_Store')) numOfFiles++;
				}
				if(numOfFiles === 0) await rm(parentDir, { force: true, recursive: true });
			}));

			return true;
		}catch{
			return false;
		}
	}
}