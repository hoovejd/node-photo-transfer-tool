// import { google } from 'googleapis';
// import { authorize } from './auth';

// async function listAlbums() {
//   const authClient = await authorize();

//   const photosClient = google.photoslibrary({
//     version: 'v1',
//     auth: authClient,
//   });

//   try {
//     const res = await photosClient.albums.list({
//       pageSize: 50,
//     });

//     const albums = res.data.albums;
//     if (albums && albums.length) {
//       console.log('Albums:');
//       albums.forEach((album) => {
//         console.log(`- ${album.title} (id: ${album.id})`);
//       });
//     } else {
//       console.log('No albums found.');
//     }
//   } catch (err) {
//     console.error('The API returned an error: ' + err);
//   }
// }

// listAlbums();
