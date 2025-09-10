import { OAuth2Client } from "google-auth-library";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import creds from "./my_oauth_creds.json";

// Scope for accessing the Photos Library API
const SCOPES = [
  "https://www.googleapis.com/auth/photoslibrary.appendonly",
  "https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata",
  "https://www.googleapis.com/auth/photoslibrary.edit.appcreateddata",
];

const TOKEN_PATH = join(process.cwd(), "token.json");

// create an oAuth client to authorize the API call
export const getOAuth2Client = (): OAuth2Client => {
  console.log('getting oauth client...')
  return new OAuth2Client({
    clientId: creds.installed.client_id,
    clientSecret: creds.installed.client_secret,
    redirect_uris: creds.installed.redirect_uris,
  });
};

export const authorize = async (): Promise<OAuth2Client> => {
  const oAuth2Client = getOAuth2Client();

  // Try to load a saved token
  try {
    const token = readFileSync(TOKEN_PATH, "utf-8");
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  } catch (err) {
    console.log('generating a new token')
    return getNewToken(oAuth2Client);
  }
};

const getNewToken = async (oAuth2Client: OAuth2Client): Promise<OAuth2Client> => {
  // Generate the url that will be used for the consent dialog.
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline", // Request a refresh token
    scope: SCOPES,
  });

  console.log("Authorize this app by visiting this URL:", authUrl);

  return new Promise((resolve, reject) => {
    // This part would typically be a web server redirect. For a simple script,
    // you'll need to manually get the `code` from the redirect URL.
    console.log("After authorizing, visit the redirect URL and copy the code parameter.");
    console.log("Paste the code here:");

    const server = require("express")();
    const port = 3000;
    server.get("/oauth2callback", async (req: any, res: any) => {
      const code = req.query.code;
      if (!code) {
        res.send("Authorization failed. No code received.");
        reject(new Error("No authorization code."));
        return;
      }

      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      // Store the token to disk for later program executions
      writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
      res.send("Authorization successful! You can close this window.");
      server.destroy();
      resolve(oAuth2Client);
    });

    const s = server.listen(port, () => {
      console.log(`Listening for OAuth redirect on port ${port}`);
    });

    s.destroy = () => {
      s.close();
    };
  });
};
