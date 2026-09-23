import { Command } from "commander";
import { client } from "../lib/client.js";
import { listItems } from "../lib/dates.js";
import { handleError } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { output } from "../lib/output.js";

export const tasklistsResource = new Command("tasklists").description("Manage Google task lists");

function emitList(data: unknown, opts: { json?: boolean; format?: string; fields?: string }): void {
  const { items, nextPageToken } = listItems(data);
  if (nextPageToken && !opts.json) log.info(`nextPageToken=${nextPageToken}`);
  output(opts.json ? { items, nextPageToken } : items, {
    json: opts.json,
    format: opts.format,
    fields: opts.fields?.split(","),
  });
}

tasklistsResource
  .command("list")
  .description("List the authenticated user's task lists")
  .option("--max-results <n>", "Page size, max 100", "100")
  .option("--page-token <token>", "Page token from a previous list")
  .option("--fields <cols>", "Comma-separated columns")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .addHelpText("after", "\nExamples:\n  google-tasks-cli tasklists list --json")
  .action(async (opts) => {
    try {
      const data = await client.get("/tasks/v1/users/@me/lists", {
        maxResults: opts.maxResults,
        pageToken: opts.pageToken,
      });
      emitList(data, opts);
    } catch (err) {
      handleError(err, opts.json);
    }
  });

tasklistsResource
  .command("get <tasklist>")
  .description("Get one task list")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .action(async (tasklist: string, opts) => {
    try {
      const data = await client.get(`/tasks/v1/users/@me/lists/${encodeURIComponent(tasklist)}`);
      output(data, { json: opts.json, format: opts.format });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

tasklistsResource
  .command("create")
  .description("Create a task list")
  .requiredOption("--title <title>", "List title, max 1024 characters")
  .option("--json", "Output as JSON")
  .addHelpText("after", "\nExamples:\n  google-tasks-cli tasklists create --title Inbox --json")
  .action(async (opts) => {
    try {
      const data = await client.post("/tasks/v1/users/@me/lists", { title: opts.title });
      output(data, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

tasklistsResource
  .command("update <tasklist>")
  .description("Rename a task list")
  .requiredOption("--title <title>", "New title")
  .option("--json", "Output as JSON")
  .action(async (tasklist: string, opts) => {
    try {
      const data = await client.patch(`/tasks/v1/users/@me/lists/${encodeURIComponent(tasklist)}`, { title: opts.title });
      output(data, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

tasklistsResource
  .command("delete <tasklist>")
  .description("Delete a task list and its assigned originals")
  .option("--json", "Output as JSON")
  .action(async (tasklist: string, opts) => {
    try {
      await client.delete(`/tasks/v1/users/@me/lists/${encodeURIComponent(tasklist)}`);
      output({ deleted: true, id: tasklist }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });
