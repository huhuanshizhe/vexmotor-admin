import { config } from 'dotenv';

config({ path: '.env.local' });
config();

if (process.env.NODE_ENV !== 'production') {
	const localAppUrl = process.env.APP_URL ?? 'http://localhost:5100';

	process.env.APP_URL ??= localAppUrl;
	process.env.NEXTAUTH_URL ??= localAppUrl;
	process.env.AUTH_URL ??= localAppUrl;
}