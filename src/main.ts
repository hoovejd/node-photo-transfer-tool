import { OAuth2Client } from "google-auth-library";
import http from "http";
import open from "open";
import { join } from "path";
import destroyer from "server-destroy";
import { URL } from "url";

// Download your OAuth2 configuration from the Google
import creds from "./my_oauth_creds.json";
import { readFileSync, writeFileSync } from "fs";

const TOKEN_PATH = join(process.cwd(), "token.json");

// Scope for accessing the Photos Library API
const SCOPES = [
  "https://www.googleapis.com/auth/photoslibrary.appendonly",
  "https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata",
  "https://www.googleapis.com/auth/photoslibrary.edit.appcreateddata",
  "https://www.googleapis.com/auth/userinfo.profile",
];

/**
 * Start by acquiring a pre-authenticated oAuth2 client.
 */
async function main() {
  const oAuth2Client = await getAuthenticatedClient();
  // Make a simple request to the People API using our pre-authenticated client.
  const apiUrl = "https://people.googleapis.com/v1/people/me?personFields=names";
  const res = await oAuth2Client.fetch(apiUrl);
  console.log(`data returned from people API: ${JSON.stringify(res.data)}`);

  // Check on the audience, expiration, or original scopes requested.
  const tokenInfo = await oAuth2Client.getTokenInfo(oAuth2Client.credentials.access_token as string);
  console.log("Token info:");
  console.log(tokenInfo);
}

/**
 * Create a new OAuth2Client, and go through the OAuth2 content workflow.
 * Return the full client to the callback.
 */
function getAuthenticatedClient(): Promise<OAuth2Client> {
  return new Promise((resolve, reject) => {
    const oAuth2Client = new OAuth2Client({
      clientId: creds.installed.client_id,
      clientSecret: creds.installed.client_secret,
      redirect_uris: creds.installed.redirect_uris,
    });

    try {
      const token = JSON.parse(readFileSync(TOKEN_PATH, "utf8"));
      console.log('reusing existing token')
      oAuth2Client.setCredentials(token);
      resolve(oAuth2Client);
    } catch (err) {
      console.warn("Failed to load existing token, need to create a new one");
    }

    // Generate the url that will be used for the consent dialog.
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });

    // Open an http server to accept the oauth callback.
    const server = http
      .createServer(async (req, res) => {
        try {
          if (req.url && req.url.indexOf("/oauth2callback") > -1) {
            // acquire the code from the querystring, and close the web server.
            const qs = new URL(req.url, "http://localhost:3000").searchParams;
            const code = qs.get("code");
            console.log(`Code is ${code}`);
            res.end("Authentication successful! Please return to the console.");
            server.destroy();

            // Now that we have the code, use that to acquire tokens.
            if (code) {
              const r = await oAuth2Client.getToken(code);
              oAuth2Client.setCredentials(r.tokens);
              console.info("Tokens acquired.");

              // Store the token to disk for later program executions
              console.log(`Writing token to ${TOKEN_PATH}`);
              writeFileSync(TOKEN_PATH, JSON.stringify(r.tokens));

              resolve(oAuth2Client);
            } else {
              reject(new Error("No code found in callback URL."));
            }
          }
        } catch (e) {
          reject(e);
        }
      })
      .listen(3000, () => {
        console.log("opening browser to auth url");
        // open the browser to the authorize url to start the workflow
        open(authorizeUrl, { wait: false }).then((cp) => cp.unref());
      });

    destroyer(server);
  });
}

main().catch(console.error);
