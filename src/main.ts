import { OAuth2Client } from 'google-auth-library';
import { getAuthenticatedClient } from './auth';

async function main() {
  const oAuth2Client: OAuth2Client = await getAuthenticatedClient();
  fetchPersonInfo(oAuth2Client);
  displayTokenInfo(oAuth2Client);
}

async function displayTokenInfo(oAuth2Client: OAuth2Client) {
  // Check on the audience, expiration, or original scopes requested.
  const tokenInfo = await oAuth2Client.getTokenInfo(oAuth2Client.credentials.access_token as string);
  console.log("\nToken info:");
  console.log(tokenInfo);
}


// Make a simple request to the People API using our pre-authenticated client.
async function fetchPersonInfo(oAuth2Client: OAuth2Client) {
  const apiUrl = "https://people.googleapis.com/v1/people/me?personFields=names";
  const res: any = await oAuth2Client.fetch(apiUrl);
  console.log(`\ndata returned from people API: ${JSON.stringify(res.data, null, 2)}`);
  console.log(`unstructuredName: ${res.data.names?.[0].unstructuredName}`);
}

main().catch(console.error); 