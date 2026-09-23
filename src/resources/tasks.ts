import { Command } from "commander";
import { client } from "../lib/client.js";
import { listItems, toDueTimestamp } from "../lib/dates.js";
import { handleError } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { output } from "../lib/output.js";

export const tasksResource = new Command("tasks").description("Manage tasks inside a Google task list");

function emitList(data: unknown, opts: { json?: boolean; format?: string; fields?: string }): void {
  const { items, nextPageToken } = listItems(data);
  if (nextPageToken && !opts.json) log.info(`nextPageToken=${nextPageToken}`);
  output(opts.json ? { items, nextPageToken } : items, {
    json: opts.json,
    format: opts.format,
    fields: opts.fields?.split(","),
  });
}

function taskBody(opts: { title?: string; notes?: string; due?: string; status?: string }): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (opts.title) body.title = opts.title;
  if (opts.notes) body.notes = opts.notes;
  if (opts.due) body.due = toDueTimestamp(opts.due);
  if (opts.status) body.status = opts.status;
  return body;
}

tasksResource
  .command("list <tasklist>")
  .description("List tasks in a task list")
  .option("--max-results <n>", "Page size, max 100", "100")
  .option("--page-token <token>", "Page token from a previous list")
  .option("--show-completed", "Include completed tasks")
  .option("--show-hidden", "Include hidden tasks")
  .option("--show-deleted", "Include deleted tasks")
  .option("--due-min <date>", "Due on or after YYYY-MM-DD")
  .option("--due-max <date>", "Due before YYYY-MM-DD")
  .option("--fields <cols>", "Comma-separated columns")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .addHelpText("after", "\nExamples:\n  google-tasks-cli tasks list <tasklist> --show-completed --json")
  .action(async (tasklist: string, opts) => {
    try {
      const data = await client.get(`/tasks/v1/lists/${encodeURIComponent(tasklist)}/tasks`, {
        maxResults: opts.maxResults,
        pageToken: opts.pageToken,
        showCompleted: opts.showCompleted ? "true" : "",
        showHidden: opts.showHidden ? "true" : "",
        showDeleted: opts.showDeleted ? "true" : "",
        dueMin: opts.dueMin ? toDueTimestamp(opts.dueMin) : "",
        dueMax: opts.dueMax ? toDueTimestamp(opts.dueMax) : "",
      });
      emitList(data, opts);
    } catch (err) {
      handleError(err, opts.json);
    }
  });

tasksResource
  .command("get <tasklist> <task>")
  .description("Get one task")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .action(async (tasklist: string, task: string, opts) => {
    try {
      const data = await client.get(`/tasks/v1/lists/${encodeURIComponent(tasklist)}/tasks/${encodeURIComponent(task)}`);
      output(data, { json: opts.json, format: opts.format });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

tasksResource
  .command("create <tasklist>")
  .description("Create a task. Due stores the date only, not the time.")
  .requiredOption("--title <title>", "Task title, max 1024 characters")
  .option("--notes <notes>", "Notes, max 8192 characters")
  .option("--due <date>", "Due date, YYYY-MM-DD")
  .option("--parent <task>", "Parent task id")
  .option("--previous <task>", "Insert after this sibling")
  .option("--json", "Output as JSON")
  .addHelpText("after", "\nExamples:\n  google-tasks-cli tasks create <tasklist> --title 'Call Tony' --due 2026-09-24 --json")
  .action(async (tasklist: string, opts) => {
    try {
      const data = await client.post(
        `/tasks/v1/lists/${encodeURIComponent(tasklist)}/tasks`,
        taskBody(opts),
        { parent: opts.parent, previous: opts.previous },
      );
      output(data, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

tasksResource
  .command("update <tasklist> <task>")
  .description("Patch a task")
  .option("--title <title>", "New title")
  .option("--notes <notes>", "New notes")
  .option("--due <date>", "New due date, YYYY-MM-DD")
  .option("--status <status>", "needsAction or completed")
  .option("--json", "Output as JSON")
  .action(async (tasklist: string, task: string, opts) => {
    try {
      const body = taskBody(opts);
      if (opts.status === "completed") body.completed = new Date().toISOString();
      const data = await client.patch(`/tasks/v1/lists/${encodeURIComponent(tasklist)}/tasks/${encodeURIComponent(task)}`, body);
      output(data, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

tasksResource
  .command("complete <tasklist> <task>")
  .description("Mark a task completed")
  .option("--json", "Output as JSON")
  .action(async (tasklist: string, task: string, opts) => {
    try {
      const data = await client.patch(`/tasks/v1/lists/${encodeURIComponent(tasklist)}/tasks/${encodeURIComponent(task)}`, {
        status: "completed",
        completed: new Date().toISOString(),
      });
      output(data, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

tasksResource
  .command("reopen <tasklist> <task>")
  .description("Mark a task as needsAction")
  .option("--json", "Output as JSON")
  .action(async (tasklist: string, task: string, opts) => {
    try {
      const data = await client.patch(`/tasks/v1/lists/${encodeURIComponent(tasklist)}/tasks/${encodeURIComponent(task)}`, {
        status: "needsAction",
        completed: null,
      });
      output(data, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

tasksResource
  .command("move <tasklist> <task>")
  .description("Move a task under a parent or after a sibling")
  .option("--parent <task>", "New parent. Omit to move to the top level")
  .option("--previous <task>", "Insert after this sibling")
  .option("--destination <tasklist>", "Destination task list")
  .option("--json", "Output as JSON")
  .action(async (tasklist: string, task: string, opts) => {
    try {
      const data = await client.post(
        `/tasks/v1/lists/${encodeURIComponent(tasklist)}/tasks/${encodeURIComponent(task)}/move`,
        undefined,
        { parent: opts.parent, previous: opts.previous, destinationTasklist: opts.destination },
      );
      output(data, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

tasksResource
  .command("clear <tasklist>")
  .description("Hide every completed task in the list")
  .option("--json", "Output as JSON")
  .action(async (tasklist: string, opts) => {
    try {
      await client.post(`/tasks/v1/lists/${encodeURIComponent(tasklist)}/clear`);
      output({ cleared: true, tasklist }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

tasksResource
  .command("delete <tasklist> <task>")
  .description("Delete a task. Assigned tasks also delete the Docs or Chat original")
  .option("--json", "Output as JSON")
  .action(async (tasklist: string, task: string, opts) => {
    try {
      await client.delete(`/tasks/v1/lists/${encodeURIComponent(tasklist)}/tasks/${encodeURIComponent(task)}`);
      output({ deleted: true, id: task }, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });
