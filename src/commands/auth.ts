import { Command } from "commander";
import { getToken, hasToken, maskToken, removeToken, setToken } from "../lib/auth.js";
import { client } from "../lib/client.js";
import { handleError } from "../lib/errors.js";
import { hasSession, login, readSession, removeSession } from "../lib/google-auth.js";
import { log } from "../lib/logger.js";

export const authCommand = new Command("auth").description("Manage Google Tasks OAuth");

authCommand
  .command("login")
  .description("Sign in with a Google Cloud desktop OAuth client")
  .option("--credentials <file>", "Desktop client JSON downloaded from Google Cloud")
  .option("--no-browser", "Print the consent URL instead of opening a browser")
  .addHelpText("after", "\nExample:\n  google-tasks-cli auth login --credentials ~/Downloads/client_secret.json")
  .action(async (opts: { credentials?: string; browser?: boolean }) => {
    try {
      const session = await login({ credentials: opts.credentials, noBrowser: opts.browser === false });
      log.success(`Signed in. Refresh token stored. Expires ${new Date(session.expiry).toISOString()}`);
    } catch (err) {
      handleError(err);
    }
  });

authCommand
  .command("set")
  .description("Save a raw access token (expires in about 1 hour; prefer auth login)")
  .argument("<token>", "OAuth access token")
  .action((token: string) => {
    setToken(token);
    log.success("Access token saved. It will not refresh.");
  });

authCommand
  .command("show")
  .description("Show whether a session or raw token is configured")
  .option("--raw", "Print the current access token")
  .action(async (opts: { raw?: boolean }) => {
    try {
      if (hasSession()) {
        const session = readSession();
        if (!session) return;
        console.log(opts.raw ? session.access_token : `Session: ${maskToken(session.access_token)} refresh=${Boolean(session.refresh_token)}`);
        return;
      }
      if (!hasToken()) {
        log.warn("Not signed in. Run: google-tasks-cli auth login --credentials <client_secret.json>");
        return;
      }
      const token = getToken();
      console.log(opts.raw ? token : `Token: ${maskToken(token)}`);
    } catch (err) {
      handleError(err);
    }
  });

authCommand
  .command("remove")
  .description("Delete the saved session and raw token")
  .action(() => {
    removeSession();
    removeToken();
    log.success("Credentials removed");
  });

authCommand
  .command("test")
  .description("Call tasklists.list to verify the session")
  .action(async () => {
    try {
      await client.get("/tasks/v1/users/@me/lists", { maxResults: "1" });
      log.success("Google Tasks session is valid");
    } catch (err) {
      handleError(err);
    }
  });
