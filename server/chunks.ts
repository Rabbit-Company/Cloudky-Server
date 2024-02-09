import Blake2b from "@rabbit-company/blake2b";
import Logger from "@rabbit-company/logger";

export interface ChunkData{
	owner: string;
	uploadID: string;
	path: string;
	chunks: string[];
	completed: Set<string>;
	created: number;
}

export async function saveChunk(chunkData: ChunkData, data: Buffer): Promise<boolean>{
	let hash = Blake2b.hash(data, '');
	if(!chunkData.chunks.includes(hash)) return false;
	if(chunkData.completed.has(hash)) return false;

	const targetPath = `${process.env.DATA_DIRECTORY}/tmp/${chunkData.owner}/${chunkData.uploadID}/${hash}`;
	try{
		await Bun.write(targetPath, data, { createPath: true });
	}catch(err){
		Logger.error('[CHUNK] Saving');
		return false;
	}

	chunkData.completed.add(hash);
	return true;
}

export async function buildChunks(chunkData: ChunkData): Promise<boolean>{
	if(chunkData.chunks.length !== chunkData.completed.size) return false;

	const chunkPath = `${process.env.DATA_DIRECTORY}/tmp/${chunkData.owner}/${chunkData.uploadID}`;
	const targetPath = `${process.env.DATA_DIRECTORY}/data/${chunkData.owner}/${chunkData.path}`;

	const file = Bun.file(targetPath);
	try{
		const writer = file.writer();
		for(let i = 0; i < chunkData.chunks.length; i++){
			const chunk = chunkData.chunks[i];
			writer.write(await Bun.file(`${chunkPath}/${chunk}`).arrayBuffer());
			writer.flush();
		}
		writer.end();
	}catch(err){
		Logger.error('[CHUNK] Building');
		return false;
	}
	return true;
}