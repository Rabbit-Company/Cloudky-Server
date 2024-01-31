import Logger from '@rabbit-company/logger';
import { readdir } from "node:fs/promises";
import {
	type _Object
} from "@aws-sdk/client-s3";

export default class LocalStorage{

	static async listUserFiles(username: string): Promise<{Key: string; LastModified: string; Size: number;}[]>{
		try{
			const path = `${process.env.DATA_DIRECTORY}/data/${username}/`;
			let res = await readdir(path, { recursive: true, withFileTypes: true });
			let fileNames = res.filter(dirent => dirent.isFile()).map(dirent => dirent.name);

			let files: { Key: string; LastModified: string; Size: number; }[] = [];
			fileNames.forEach(fileName => {
				let file = Bun.file(`${path}/${fileName}`);
				files.push({
					Key: fileName,
					LastModified: new Date(file.lastModified).toISOString(),
					Size: file.size
				});
			});

			return files;
		}catch{
			return [];
		}
	}
}