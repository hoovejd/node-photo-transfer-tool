import { OAuth2Client, TokenInfo } from 'google-auth-library';
import { getAuthenticatedClient } from './auth';

async function main() {
  const oAuth2Client: OAuth2Client = await getAuthenticatedClient();
  //fetchPersonInfo(oAuth2Client);
  //displayTokenInfo(oAuth2Client);
  listAlbums(oAuth2Client);
}

async function displayTokenInfo(oAuth2Client: OAuth2Client) {
  // Check on the audience, expiration, or original scopes requested.
  const tokenInfo: TokenInfo = await oAuth2Client.getTokenInfo(oAuth2Client.credentials.access_token as string);
  console.log(`Token expires on ${new Date(tokenInfo.expiry_date).toLocaleString()}`);
}


// Make a simple request to the People API using our pre-authenticated client.
async function fetchPersonInfo(oAuth2Client: OAuth2Client) {
  const apiUrl = "https://people.googleapis.com/v1/people/me?personFields=names";
  const res: any = await oAuth2Client.fetch(apiUrl);
  console.log(`\ndata returned from people API: ${JSON.stringify(res.data, null, 2)}`);
  console.log(`unstructuredName: ${res.data.names?.[0].unstructuredName}`);
}

function listAlbums(oAuth2Client: OAuth2Client) {
  const apiUrl = "https://photoslibrary.googleapis.com/v1/albums";
  oAuth2Client.fetch(apiUrl).then((res: any) => {
    //console.log(`\ndata returned from photos API: ${JSON.stringify(res.data, null, 2)}`);

    res.data.albums?.forEach((album: any) => {
      console.log(`Album title: ${album.title}, id: ${album.id}`);
    });
  });
}

main().catch(console.error); 