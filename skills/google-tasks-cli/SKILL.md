---
name: google-tasks-cli
description: "Manage Google Tasks via CLI - auth, tasklists, tasks. Use when the user mentions 'Google Tasks', 'task list', 'google-tasks-cli', 'mark a Google task done', or wants to create, list, complete, move, or clear tasks through the Google Tasks API."
category: productivity
---

# google-tasks-cli

Agent-ready CLI for the [Google Tasks API](https://developers.google.com/workspace/tasks/reference/rest) (`https://tasks.googleapis.com`).

## When To Use This Skill

Use the `google-tasks-cli` skill when you need to:

- list the signed-in user's Google task lists and tasks
- create a task or task list, including a date-only due day
- mark a task completed or reopen it
- move a task under a parent, after a sibling, or to another list
- clear completed tasks from a list
- chain those reads and writes with `--json`

## Capabilities

- **Auth**: desktop OAuth login with PKCE, refresh-token storage, and `auth test`
- **Task lists**: list, get, create, rename, delete
- **Tasks**: list with due and completion filters, get, create, patch, complete, reopen, move, clear, delete
- **Due dates**: `--due` accepts `YYYY-MM-DD`. The API stores the date and discards the time
- **Automation**: `--json` envelope and `--help` at CLI, resource, and action level

## Common Use Cases

- "List my Google task lists, then show open tasks in the default list."
- "Add a task called Call Tony due tomorrow."
- "Mark task ID abc complete."
- "Move this task under its parent, then clear completed tasks."

## Setup

If `google-tasks-cli` is not found:

```bash
npx api2cli install Nardjo/google-tasks-cli
```

One-time Google Cloud setup, done by the user:

1. Enable the Google Tasks API.
2. Create an OAuth client of type Desktop app.
3. Download the client JSON.

```bash
google-tasks-cli auth login --credentials ~/Downloads/client_secret.json
google-tasks-cli auth test
```

Scope requested: `https://www.googleapis.com/auth/tasks`.

Always use `--json` when calling commands programmatically.

## Working Rules

- Start with `tasklists list` to get a list id. Do not guess `@default` unless a prior response proved it.
- `--due` is a calendar day, not a deadline time.
- Deleting an assigned task also deletes the original in Docs or Chat.
- Deleting a task list deletes assigned originals in that list.
- `tasks clear` hides completed tasks. It does not delete open tasks.
- Page with `--page-token` when `nextPageToken` is present.

## Authentication

```bash
google-tasks-cli auth login --credentials ~/Downloads/client_secret.json
google-tasks-cli auth show
google-tasks-cli auth test
google-tasks-cli auth remove
```

`auth set <token>` stores a raw access token that expires in about one hour and does not refresh. Prefer `auth login`.

Session file: `~/.config/tokens/google-tasks-cli.json` (chmod 600).
OAuth client: `~/.config/google-tasks-cli/credentials.json` (chmod 600).

## Resources

### auth

| Command | Description |
|---------|-------------|
| `google-tasks-cli auth login --credentials <file>` | Browser OAuth login |
| `google-tasks-cli auth login --credentials <file> --no-browser` | Print the consent URL |
| `google-tasks-cli auth show` | Masked session or token |
| `google-tasks-cli auth test` | Call `tasklists.list` |
| `google-tasks-cli auth remove` | Delete session and raw token |

### tasklists

| Command | Description |
|---------|-------------|
| `google-tasks-cli tasklists list --json` | List task lists |
| `google-tasks-cli tasklists list --max-results 20 --page-token <token> --json` | Page through lists |
| `google-tasks-cli tasklists get <tasklist> --json` | Get one list |
| `google-tasks-cli tasklists create --title "Inbox" --json` | Create a list |
| `google-tasks-cli tasklists update <tasklist> --title "Work" --json` | Rename a list |
| `google-tasks-cli tasklists delete <tasklist> --json` | Delete a list |

### tasks

| Command | Description |
|---------|-------------|
| `google-tasks-cli tasks list <tasklist> --json` | List tasks, open by default |
| `google-tasks-cli tasks list <tasklist> --show-completed --json` | Include completed |
| `google-tasks-cli tasks list <tasklist> --due-min 2026-09-01 --due-max 2026-09-30 --json` | Filter by due day |
| `google-tasks-cli tasks list <tasklist> --show-hidden --show-deleted --json` | Include hidden and deleted |
| `google-tasks-cli tasks get <tasklist> <task> --json` | Get one task |
| `google-tasks-cli tasks create <tasklist> --title "Call Tony" --due 2026-09-24 --json` | Create a task |
| `google-tasks-cli tasks create <tasklist> --title "Subtask" --parent <task> --json` | Create under a parent |
| `google-tasks-cli tasks update <tasklist> <task> --title "New title" --notes "Details" --json` | Patch title and notes |
| `google-tasks-cli tasks update <tasklist> <task> --status completed --json` | Patch status |
| `google-tasks-cli tasks complete <tasklist> <task> --json` | Mark completed |
| `google-tasks-cli tasks reopen <tasklist> <task> --json` | Mark needsAction |
| `google-tasks-cli tasks move <tasklist> <task> --parent <task> --previous <task> --json` | Reposition |
| `google-tasks-cli tasks move <tasklist> <task> --destination <tasklist> --json` | Move to another list |
| `google-tasks-cli tasks clear <tasklist> --json` | Hide completed tasks |
| `google-tasks-cli tasks delete <tasklist> <task> --json` | Delete a task |

## Output Format

`--json` returns:

```json
{ "ok": true, "data": { "items": [], "nextPageToken": null }, "meta": {} }
```

Single resources return the Google object in `data`. On error: `{ "ok": false, "error": { "message": "...", "status": 401 } }`.

## Quick Reference

```bash
google-tasks-cli --help
google-tasks-cli <resource> --help
google-tasks-cli <resource> <action> --help
```

## Global Flags

`--json`, `--format <text|json|csv|yaml>`, `--verbose`, `--no-color`, `--no-header`.

Exit codes: 0 = success, 1 = API error, 2 = usage error.

## Docs

- REST reference: https://developers.google.com/workspace/tasks/reference/rest
- Discovery: https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest
- Scopes: https://developers.google.com/workspace/tasks/auth
