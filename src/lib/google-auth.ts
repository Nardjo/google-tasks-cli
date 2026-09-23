import { createHash, randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { APP_CLI } from "./config.js";
import { CliError } from "./errors.js";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";
const SKEW_MS = 60_000;

export const CREDENTIALS_PATH = join(homedir(), ".config", "google-tasks-cli", "credentials.json");
export const SESSION_PATH = join(homedir(), ".config", "tokens", "google-tasks-cli.json");

export interface GoogleClient {
  clientId: string;
  clientSecret?: string;
}

export interface Session {
  access_token: string;
  refresh_token?: string;
  expiry: number;
  scope?: string;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

function writeSecret(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, { mode: 0o600 });
  chmodSync(path, 0o600);
}

export function parseClientJson(raw: string): GoogleClient {
  const parsed = JSON.parse(raw) as {
    installed?: { client_id?: string; client_secret?: string };
    web?: { client_id?: string; client_secret?: string };
    client_id?: string;
    client_secret?: string;
  };
  const block = parsed.installed ?? parsed.web ?? parsed;
  if (!block.client_id) {
    throw new CliError(2, "OAuth client JSON has no client_id.", "Download a Desktop app client from Google Cloud.");
  }
  return { clientId: block.client_id, clientSecret: block.client_secret };
}

export function saveCredentials(file: string): GoogleClient {
  const client = parseClientJson(readFileSync(file, "utf8"));
  writeSecret(CREDENTIALS_PATH, JSON.stringify(client));
  return client;
}

export function loadClient(): GoogleClient {
  if (process.env.GOOGLE_TASKS_CLIENT_ID) {
    return {
      clientId: process.env.GOOGLE_TASKS_CLIENT_ID,
      clientSecret: process.env.GOOGLE_TASKS_CLIENT_SECRET,
    };
  }
  if (!existsSync(CREDENTIALS_PATH)) {
    throw new CliError(
      2,
      "No Google OAuth client configured.",
      `Run: ${APP_CLI} auth login --credentials /path/to/client_secret.json`,
    );
  }
  return parseClientJson(readFileSync(CREDENTIALS_PATH, "utf8"));
}

export function hasSession(): boolean {
  return existsSync(SESSION_PATH);
}

export function readSession(): Session | null {
  if (!hasSession()) return null;
  return JSON.parse(readFileSync(SESSION_PATH, "utf8")) as Session;
}

export function writeSession(session: Session): void {
  writeSecret(SESSION_PATH, JSON.stringify(session));
}

export function removeSession(): void {
  if (existsSync(SESSION_PATH)) unlinkSync(SESSION_PATH);
}

async function exchange(body: URLSearchParams): Promise<Session> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new CliError(res.status || 1, data.error_description ?? data.error ?? "Token exchange failed");
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry: Date.now() + (data.expires_in ?? 3600) * 1000,
    scope: data.scope,
  };
}

export async function refreshSession(session: Session, client: GoogleClient): Promise<Session> {
  if (!session.refresh_token) {
    throw new CliError(2, "Access token expired and no refresh token is stored.", `Run: ${APP_CLI} auth login`);
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: session.refresh_token,
    client_id: client.clientId,
  });
  if (client.clientSecret) body.set("client_secret", client.clientSecret);
  const next = await exchange(body);
  next.refresh_token = next.refresh_token ?? session.refresh_token;
  writeSession(next);
  return next;
}

export async function accessToken(): Promise<string> {
  const session = readSession();
  if (!session?.access_token) {
    throw new CliError(2, "Not signed in to Google Tasks.", `Run: ${APP_CLI} auth login --credentials <client_secret.json>`);
  }
  if (session.expiry - SKEW_MS > Date.now()) return session.access_token;
  const next = await refreshSession(session, loadClient());
  return next.access_token;
}

function listen(port: number): Promise<{ server: Server; port: number }> {
  const server = createServer();
  const { promise, resolve, reject } = Promise.withResolvers<{ server: Server; port: number }>();
  server.once("error", reject);
  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      reject(new Error("loopback listen failed"));
      return;
    }
    resolve({ server, port: address.port });
  });
  return promise;
}

export async function login(opts: { credentials?: string; noBrowser?: boolean }): Promise<Session> {
  if (opts.credentials) saveCredentials(opts.credentials);
  const client = loadClient();
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(16).toString("base64url");
  const { server, port } = await listen(0);
  const redirect = `http://127.0.0.1:${port}`;
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const timer = setTimeout(() => {
    server.close();
    reject(new CliError(2, "Login timed out after 3 minutes."));
  }, 180_000);

  server.on("request", (req, res) => {
    const url = new URL(req.url ?? "/", redirect);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<p>Google Tasks CLI can use this window's grant. You can close it.</p>");
    if (url.searchParams.get("state") !== state) return;
    clearTimeout(timer);
    server.close();
    const err = url.searchParams.get("error");
    const authCode = url.searchParams.get("code");
    if (err || !authCode) reject(new CliError(1, err ?? "Google did not return a code"));
    else resolve(authCode);
  });

  const auth = new URL(AUTH_URL);
  auth.searchParams.set("client_id", client.clientId);
  auth.searchParams.set("redirect_uri", redirect);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", TASKS_SCOPE);
  auth.searchParams.set("access_type", "offline");
  auth.searchParams.set("prompt", "consent");
  auth.searchParams.set("state", state);
  auth.searchParams.set("code_challenge", challenge);
  auth.searchParams.set("code_challenge_method", "S256");
  if (opts.noBrowser) console.log(auth.toString());
  else {
    const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    Bun.spawn([opener, auth.toString()], { stdout: "ignore", stderr: "ignore" });
  }

  const code = await promise;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: client.clientId,
    redirect_uri: redirect,
    code_verifier: verifier,
  });
  if (client.clientSecret) body.set("client_secret", client.clientSecret);
  const session = await exchange(body);
  session.refresh_token = session.refresh_token ?? readSession()?.refresh_token;
  if (!session.refresh_token) {
    throw new CliError(1, "Google did not return a refresh token. Revoke the app and run auth login again.");
  }
  writeSession(session);
  return session;
}
