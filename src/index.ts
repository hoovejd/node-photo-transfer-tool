import { authorize } from './auth';
import { OAuth2Client } from 'google-auth-library';

async function main() {
  const authClient: OAuth2Client = await authorize();
}

main();