import { log } from "console";
import { readdirSync, readFileSync, statSync } from "fs";
import { OAuth2Client, TokenInfo } from "google-auth-library";
import mime from "mime-types";
import path from "path";
import { getAuthenticatedClient } from "./auth";

async function main() {
  const oAuth2Client: OAuth2Client = await getAuthenticatedClient();
  //fetchPersonInfo(oAuth2Client);
  //displayTokenInfo(oAuth2Client);
  //listAlbums(oAuth2Client);
  //uploadImage(oAuth2Client);
  // const albumId = await createAlbum(oAuth2Client, "Another New Album from API");
  // console.log(`Created album with ID ${albumId}`)
  //uploadAllPhotos(oAuth2Client, "/home/hoovejd/pictures");
  uploadAllPhotos(oAuth2Client, "/home/hoovejd/test_video");
}

async function displayTokenInfo(oAuth2Client: OAuth2Client) {
  // Check on the audience, expiration, or original scopes requested.
  const tokenInfo: TokenInfo = await oAuth2Client.getTokenInfo(oAuth2Client.credentials.access_token as string);
  log(`Token expires on ${new Date(tokenInfo.expiry_date).toLocaleString()}`);
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

async function uploadImageTest(oAuth2Client: OAuth2Client) {
  const accessToken = oAuth2Client.credentials.access_token;
  const imageBuffer = readFileSync("src/kitty.jpeg");

  const uploadResponse: Response = await fetch("https://photoslibrary.googleapis.com/v1/uploads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-type": "application/octet-stream",
      "X-Goog-Upload-Content-Type": "image/jpeg",
      "X-Goog-Upload-Protocol": "raw",
    },
    body: imageBuffer,
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
          uploadToken: uploadToken,
        },
      },
    ],
  };

  const createResponse: Response = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const createResult = await createResponse.json();
  console.log("Create response:", JSON.stringify(createResult, null, 2));
}

async function createAlbum(oAuth2Client: OAuth2Client, title: string): Promise<string> {
  const accessToken = oAuth2Client.credentials.access_token;
  const body = {
    album: {
      title: title,
    },
  };

  const response = await fetch("https://photoslibrary.googleapis.com/v1/albums", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();
  console.log("Created album:", JSON.stringify(json, null, 2));
  return json.id;
}

// Uploads an image and returns the upload token
async function uploadImage(oAuth2Client: OAuth2Client, imagePath: string): Promise<string> {
  const accessToken = oAuth2Client.credentials.access_token;
  const imageBuffer = readFileSync(imagePath);
  const mimeType = mime.lookup(imagePath);
  log(`MIME type for ${imagePath} is ${mimeType}`);
  if (!mimeType) {
    throw new Error(`Could not determine MIME type for file: ${imagePath}`);
  }

  // Upload the image to get an upload token
  const uploadResponse: Response = await fetch("https://photoslibrary.googleapis.com/v1/uploads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-type": "application/octet-stream",
      "X-Goog-Upload-Content-Type": mimeType,
      "X-Goog-Upload-Protocol": "raw",
    },
    body: imageBuffer,
  });

  return uploadResponse.text();
}

async function uploadAllPhotos(oAuth2Client: OAuth2Client, rootPhotoDir: string) {
  const rootObjectPaths: string[] = readdirSync(rootPhotoDir);
  for (const objectPath of rootObjectPaths) {
    const fullPath = path.join(rootPhotoDir, objectPath);
    console.log(`year dir: ${fullPath}`);
    if (statSync(fullPath).isDirectory()) {
      const albumDirectoryPaths: string[] = readdirSync(fullPath);

      // iterate over each album directory
      for (const albumDirPath of albumDirectoryPaths) {
        const albumDirFullPath = path.join(fullPath, albumDirPath);
        console.log(`album path: ${albumDirFullPath}`);
        console.log(`album name: ${albumDirPath}`);

        // create album
        const albumId: string = await createAlbum(oAuth2Client, albumDirPath);
        console.log(`Created album with ID ${albumId}`);

        // iterate over each photo in the album directory
        const photoPaths: string[] = readdirSync(albumDirFullPath);
        const photoInfo: { fileName: string; uploadToken: string }[] = [];
        for (const photoPath of photoPaths) {
          log(`photo path: ${photoPath}`);
          const photoFullPath = path.join(albumDirFullPath, photoPath);
          if (statSync(photoFullPath).isFile()) {
            console.log(`full photo path: ${photoFullPath}`);

            if (photoFullPath.includes("Zone.Identifier")) {
              console.warn(`skipping Zone Identifier: ${photoFullPath}`);
              continue;
            }

            // upload image to get upload token
            const uploadToken: string = await uploadImage(oAuth2Client, photoFullPath);
            console.log(`Obtained upload token for ${photoFullPath}`);
            photoInfo.push({ fileName: photoPath, uploadToken: uploadToken });

            if (photoInfo.length >= 50) {
              console.log(`Reached 50 photos, uploading batch to album ${albumId}`);

              // batch create media items in the album
              await batchCreate(photoInfo, albumId, oAuth2Client);

              // clear photoInfo for next batch
              photoInfo.length = 0;
            }
          } else {
            console.error(`Unexpected directory!: ${photoFullPath}`);
          }
        }

        // upload any remaining photos in the album
        if (photoInfo.length > 0) {
          console.log(`Uploading final batch of ${photoInfo.length} photos to album ${albumId}`);
          await batchCreate(photoInfo, albumId, oAuth2Client);
          photoInfo.length = 0;
        }
      }
    }
  }
}

async function batchCreate(
  photoInfo: { fileName: string; uploadToken: string }[],
  albumId: string,
  oAuth2Client: OAuth2Client
) {
  const body = {
    albumId: albumId,
    newMediaItems: photoInfo.map((info) => ({
      simpleMediaItem: {
        fileName: info.fileName,
        uploadToken: info.uploadToken,
      },
    })),
  };

  // batch create media items in the album
  const accessToken = oAuth2Client.credentials.access_token;
  const createResponse: Response = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const createResult = await createResponse.json();
  console.log("Batch create response:", JSON.stringify(createResult, null, 2));
}

main().catch(console.error);
