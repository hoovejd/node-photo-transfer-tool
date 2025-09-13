import { OAuth2Client, TokenInfo } from 'google-auth-library';
import { getAuthenticatedClient } from './auth';
import { readFileSync } from 'fs';

async function main() {
  const oAuth2Client: OAuth2Client = await getAuthenticatedClient();
  //fetchPersonInfo(oAuth2Client);
  //displayTokenInfo(oAuth2Client);
  //listAlbums(oAuth2Client);
  uploadImage(oAuth2Client);
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


async function uploadImage(oAuth2Client: OAuth2Client) {
  const accessToken = oAuth2Client.credentials.access_token;
  const imageBuffer = readFileSync('src/kitty.jpeg');

  const uploadResponse: Response = await fetch("https://photoslibrary.googleapis.com/v1/uploads", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-type": "application/octet-stream",
      "X-Goog-Upload-Content-Type": "image/jpeg",
      "X-Goog-Upload-Protocol": "raw"
    },
    body: imageBuffer
  });

  const uploadToken = await uploadResponse.text();
  console.log("Upload token:", uploadToken);

  const body = {
    albumId: "AHvtI5ZX3-DVVuj65VQnlWtY2CLZqNLAbhYpHhYbJr_VKmLsEdeGbzmILKPqnUVBWY07GkOy56ex",
    newMediaItems: [
      {
        description: "Uploaded via API",
        simpleMediaItem: {
          fileName: "kitty.jpeg",
          uploadToken: uploadToken
        }
      }
    ]
  };

  const createResponse: Response = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const createResult = await createResponse.json();
  console.log("Create response:", JSON.stringify(createResult, null, 2));
}

main().catch(console.error); 