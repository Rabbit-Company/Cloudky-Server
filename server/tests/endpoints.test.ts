import { expect, test, describe } from "bun:test";
import type { FileInformation } from "../storage/storage";

const username = 'test';
const email = 'test@test.com';
const password = 'a71079d42853dea26e453004338670a53814b78137ffbed07603a41d76a483aa9bc33b582f77d30a65e6f29a896c0411f38312e1d66e0bf16386c86a89bea572';

let token = '';
let files: FileInformation[] = [];

describe("endpoints", () => {

  test("account create", async () => {
    const res = await fetch('http://0.0.0.0:8085/v1/account/create', {
			method: 'POST',
			body: JSON.stringify({
				username: username,
				email: email,
				password: password,
				type: 0
			})
		});
		const data = await res.json() as { error: number, info: string};
		expect([0,1007].includes(data?.error)).toBeTrue();
  });

	test("account token", async () => {
    const res = await fetch('http://0.0.0.0:8085/v1/account/token', {
			method: 'POST',
			headers: {
				Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
			}
		});
		const data = await res.json() as { error: number, info: string, token?: string};
		token = data?.token || '';
		expect(data?.error).toBe(0);
  });

  test("account data", async () => {
		const res = await fetch('http://0.0.0.0:8085/v1/account/data', {
			method: 'GET',
			headers: {
				Authorization: 'Basic ' + Buffer.from(username + ':' + token).toString('base64')
			}
		});
		const data = await res.json() as { error: number, info: string };
    expect(data?.error).toBe(0);
  });

	test("file upload", async () => {
		const formData = new FormData();
		formData.append('name', 'test.txt');
		formData.append('file', new Blob(['Hello World!'], { type: "text/xml" }));

		const res = await fetch('http://0.0.0.0:8085/v1/file/upload', {
			method: 'PUT',
			headers: {
				Authorization: 'Basic ' + Buffer.from(username + ':' + token).toString('base64')
			},
			body: formData
		});
		const data = await res.json() as { error: number, info: string };
    expect(data?.error).toBe(0);
  });

	test("file list", async () => {
		const res = await fetch('http://0.0.0.0:8085/v1/file/list', {
			method: 'GET',
			headers: {
				Authorization: 'Basic ' + Buffer.from(username + ':' + token).toString('base64')
			}
		});
		const data = await res.json() as { error: number, info: string, data: FileInformation[] | null };
		files = data.data || [];
    expect(data?.error).toBe(0);
  });

	test("file move", async () => {
		const res = await fetch('http://0.0.0.0:8085/v1/file/move', {
			method: 'POST',
			headers: {
				Authorization: 'Basic ' + Buffer.from(username + ':' + token).toString('base64')
			},
			body: JSON.stringify({ files: ['test.txt'], destination: 'test/' })
		});
		const data = await res.json() as { error: number, info: string };
    expect(data?.error).toBe(0);
  });

	test("file delete", async () => {
		const res = await fetch('http://0.0.0.0:8085/v1/file/delete', {
			method: 'POST',
			headers: {
				Authorization: 'Basic ' + Buffer.from(username + ':' + token).toString('base64')
			},
			body: JSON.stringify({ paths: ['test/test.txt'] })
		});
		const data = await res.json() as { error: number, info: string };
    expect(data?.error).toBe(0);
  });

});