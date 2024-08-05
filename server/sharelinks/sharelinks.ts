export interface ShareLinks {
	Token: string;
	Path: string;
	Username?: string;
	Password: string | null;
	Expiration: number | null;
	Downloaded: number;
	Created: number;
	Accessed: number;
}