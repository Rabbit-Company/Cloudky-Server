import { expect, test, describe } from "bun:test";
import type { FileInformation } from "../storage/storage";
import type { ShareLinks } from "../sharelinks/sharelinks";

const username = "test";
const email = "test@test.com";
const password = "a71079d42853dea26e453004338670a53814b78137ffbed07603a41d76a483aa9bc33b582f77d30a65e6f29a896c0411f38312e1d66e0bf16386c86a89bea572";

let token = "";
let files: FileInformation[] = [];
let shareLink = "";

describe("endpoints", () => {
	test("account create", async () => {
		const res = await fetch("http://0.0.0.0:8085/v1/account/create", {
			method: "POST",
			body: JSON.stringify({
				username: username,
				email: email,
				password: password,
				type: 0,
			}),
		});
		const data = (await res.json()) as { error: number; info: string };
		expect([0, 1007].includes(data?.error)).toBeTrue();
	});

	test("account token", async () => {
		const res = await fetch("http://0.0.0.0:8085/v1/account/token", {
			method: "POST",
			headers: {
				Authorization: "Basic " + Buffer.from(username + ":" + password).toString("base64"),
			},
		});
		const data = (await res.json()) as { error: number; info: string; token?: string };
		token = data?.token || "";
		expect(data?.error).toBe(0);
	});

	test("account data", async () => {
		const res = await fetch("http://0.0.0.0:8085/v1/account/data", {
			method: "GET",
			headers: {
				Authorization: "Basic " + Buffer.from(username + ":" + token).toString("base64"),
			},
		});
		const data = (await res.json()) as { error: number; info: string };
		expect(data?.error).toBe(0);
	});

	test("file upload", async () => {
		const formData = new FormData();
		formData.append("name", "test.txt");
		formData.append("file", new Blob(["Hello World!"], { type: "text/plain" }));

		const res = await fetch("http://0.0.0.0:8085/v1/file/upload", {
			method: "PUT",
			headers: {
				Authorization: "Basic " + Buffer.from(username + ":" + token).toString("base64"),
			},
			body: formData,
		});
		const data = (await res.json()) as { error: number; info: string };
		expect(data?.error).toBe(0);
	});

	test("file list", async () => {
		const res = await fetch("http://0.0.0.0:8085/v1/file/list", {
			method: "GET",
			headers: {
				Authorization: "Basic " + Buffer.from(username + ":" + token).toString("base64"),
			},
		});
		const data = (await res.json()) as { error: number; info: string; data: FileInformation[] | null };
		files = data.data || [];
		expect(data?.error).toBe(0);
	});

	test("file rename", async () => {
		const res = await fetch("http://0.0.0.0:8085/v1/file/rename", {
			method: "POST",
			headers: {
				Authorization: "Basic " + Buffer.from(username + ":" + token).toString("base64"),
			},
			body: JSON.stringify({ path: "test.txt", destination: "test2.txt" }),
		});
		const data = (await res.json()) as { error: number; info: string };
		expect(data?.error).toBe(0);
	});

	test("file move", async () => {
		const res = await fetch("http://0.0.0.0:8085/v1/file/move", {
			method: "POST",
			headers: {
				Authorization: "Basic " + Buffer.from(username + ":" + token).toString("base64"),
			},
			body: JSON.stringify({ files: ["test2.txt"], destination: "test/" }),
		});
		const data = (await res.json()) as { error: number; info: string };
		expect(data?.error).toBe(0);
	});

	test("file download", async () => {
		const res = await fetch("http://0.0.0.0:8085/v1/file/download", {
			method: "POST",
			headers: {
				Authorization: "Basic " + Buffer.from(username + ":" + token).toString("base64"),
			},
			body: JSON.stringify({ path: "test/test2.txt" }),
		});
		let fileContent = await res.text();
		expect(fileContent).toBe("Hello World!");
	});

	test("sharelink create", async () => {
		const res = await fetch("http://0.0.0.0:8085/v1/sharelink/create", {
			method: "POST",
			headers: {
				Authorization: "Basic " + Buffer.from(username + ":" + token).toString("base64"),
			},
			body: JSON.stringify({ path: "test/test2.txt", password: null, expiration: null }),
		});
		const data = (await res.json()) as { error: number; info: string };
		expect(data?.error).toBe(0);
	});

	test("sharelink list", async () => {
		const res = await fetch("http://0.0.0.0:8085/v1/sharelink/list", {
			method: "GET",
			headers: {
				Authorization: "Basic " + Buffer.from(username + ":" + token).toString("base64"),
			},
		});
		const data = (await res.json()) as { error: number; info: string; links?: ShareLinks[] };
		if (data.links?.length) shareLink = data.links[0].Token;
		expect(data?.error).toBe(0);
	});

	test("sharelink delete", async () => {
		const res = await fetch("http://0.0.0.0:8085/v1/sharelink/delete", {
			method: "POST",
			headers: {
				Authorization: "Basic " + Buffer.from(username + ":" + token).toString("base64"),
			},
			body: JSON.stringify({ link: shareLink }),
		});
		const data = (await res.json()) as { error: number; info: string };
		expect(data?.error).toBe(0);
	});

	test("file delete", async () => {
		const res = await fetch("http://0.0.0.0:8085/v1/file/delete", {
			method: "POST",
			headers: {
				Authorization: "Basic " + Buffer.from(username + ":" + token).toString("base64"),
			},
			body: JSON.stringify({ paths: ["test/test2.txt"] }),
		});
		const data = (await res.json()) as { error: number; info: string };
		expect(data?.error).toBe(0);
	});
});
