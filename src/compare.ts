import { log } from "console";
import { getAuthenticatedClient } from "./auth";
import { OAuth2Client, TokenInfo } from "google-auth-library";
import { readdirSync } from "fs";

let fileNames: string[] = [];

async function compareAlbums() {
  const oAuth2Client: OAuth2Client = await getAuthenticatedClient();
  //listAlbums(oAuth2Client);
  await listAlbumContents(oAuth2Client, "AHvtI5a_h6ssjy2EB-aHYj_2RQzWp7h_MQVpmGXSY4EE3sEeJTSELwi73Rqvg-Dy9eiram4EFMoS");

  console.info("Files in album:");
  fileNames.forEach((fileName) => {
    console.info(fileName);
  });
  console.info(`Total files in album: ${fileNames.length}`);

  const filesInPath: string[] = readdirSync("/home/hoovejd/pictures/2009/2009 January - New Year");
  console.info("Files in path:");
  filesInPath.forEach((fileName) => {
    console.info(fileName);
  });
  console.info(`Total files in path: ${filesInPath.length}`);

    const filesNotInAlbum = filesInPath.filter((file) => !fileNames.includes(file));
    console.info("Files not in album:");
    filesNotInAlbum.forEach((fileName) => {
      console.info(fileName);
    });
    console.info(`Total files not in album: ${filesNotInAlbum.length}`);
}

function listAlbums(oAuth2Client: OAuth2Client) {
  const apiUrl = "https://photoslibrary.googleapis.com/v1/albums";
  oAuth2Client.fetch(apiUrl).then((res: any) => {
    //console.log(`\ndata returned from photos API: ${JSON.stringify(res.data, null, 2)}`);

    res.data.albums?.forEach((album: any) => {
      console.log(`Album title: ${album.title}, id: ${album.id}`);
    });

    if (res.data.nextPageToken) {
      console.log(`Next page token: ${res.data.nextPageToken}`);
      // fetch next page
      fetchNextPage(oAuth2Client, res.data.nextPageToken);
    }
  });
}

async function listAlbumContents(oAuth2Client: OAuth2Client, albumId: string) {
  const apiUrl = `https://photoslibrary.googleapis.com/v1/mediaItems:search`;
  const body = {
    albumId: albumId,
    pageSize: 10,
  };

  await oAuth2Client
    .fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    .then(async (res: any) => {
      //console.log(`\ndata returned from photos API for album ${albumId}: ${JSON.stringify(res.data, null, 2)}`);

      res.data.mediaItems?.forEach((item: any) => {
        console.log(`Media item filename: ${item.filename}, id: ${item.id}`);
        fileNames.push(item.filename);
      });

      if (res.data.nextPageToken) {
        console.log(`Next page token: ${res.data.nextPageToken}`);
        await fetchAlbumContentsNextPage(oAuth2Client, albumId, res.data.nextPageToken);
      }
    });
}

function fetchNextPage(oAuth2Client: OAuth2Client, nextPageToken: any) {
  const apiUrl = `https://photoslibrary.googleapis.com/v1/albums?pageToken=${nextPageToken}`;
  oAuth2Client.fetch(apiUrl).then(async (res: any) => {
    //console.log(`\ndata returned from photos API: ${JSON.stringify(res.data, null, 2)}`);

    res.data.albums?.forEach((album: any) => {
      console.log(`Album title: ${album.title}, id: ${album.id}`);
    });

    if (res.data.nextPageToken) {
      console.log(`Next page token: ${res.data.nextPageToken}`);
      await fetchNextPage(oAuth2Client, res.data.nextPageToken);
    }
  });
}

async function fetchAlbumContentsNextPage(oAuth2Client: OAuth2Client, albumId: string, nextPageToken: any) {
  const apiUrl = `https://photoslibrary.googleapis.com/v1/mediaItems:search?pageToken=${nextPageToken}`;
  const body = {
    albumId: albumId,
    pageSize: 10,
  };

  await oAuth2Client
    .fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    .then(async (res: any) => {
      //console.log(`\ndata returned from photos API for album ${albumId}: ${JSON.stringify(res.data, null, 2)}`);

      res.data.mediaItems?.forEach((item: any) => {
        console.log(`Media item filename: ${item.filename}, id: ${item.id}`);
        fileNames.push(item.filename);
      });

      if (res.data.nextPageToken) {
        console.log(`Next page token: ${res.data.nextPageToken}`);
        await fetchAlbumContentsNextPage(oAuth2Client, albumId, res.data.nextPageToken);
      }
    });
}

compareAlbums();
