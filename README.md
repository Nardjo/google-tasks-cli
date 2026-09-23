# google-tasks-cli

CLI for the Google Tasks API. Auth type: OAuth 2.0 bearer, refreshed from a desktop-client grant.

```bash
npx api2cli install Nardjo/google-tasks-cli
google-tasks-cli auth login --credentials ~/Downloads/client_secret.json
google-tasks-cli tasklists list --json
```

Create a Google Cloud OAuth client of type Desktop app, enable the Tasks API, and download the client JSON. The login command stores that client and a refresh token locally (chmod 600). Scope: `https://www.googleapis.com/auth/tasks`.

`due` is a calendar date. The API discards the time.

## Resources

### tasklists

| Command | Description |
|---------|-------------|
| `google-tasks-cli tasklists list --json` | List task lists |
| `google-tasks-cli tasklists get <tasklist> --json` | Get one list |
| `google-tasks-cli tasklists create --title "Inbox" --json` | Create a list |
| `google-tasks-cli tasklists update <tasklist> --title "Work" --json` | Rename a list |
| `google-tasks-cli tasklists delete <tasklist> --json` | Delete a list |

### tasks

| Command | Description |
|---------|-------------|
| `google-tasks-cli tasks list <tasklist> --json` | List tasks |
| `google-tasks-cli tasks get <tasklist> <task> --json` | Get one task |
| `google-tasks-cli tasks create <tasklist> --title "Call Tony" --due 2026-09-24 --json` | Create a task |
| `google-tasks-cli tasks update <tasklist> <task> --status completed --json` | Patch a task |
| `google-tasks-cli tasks complete <tasklist> <task> --json` | Mark completed |
| `google-tasks-cli tasks reopen <tasklist> <task> --json` | Reopen a task |
| `google-tasks-cli tasks move <tasklist> <task> --destination <tasklist> --json` | Move a task |
| `google-tasks-cli tasks clear <tasklist> --json` | Hide completed tasks |
| `google-tasks-cli tasks delete <tasklist> <task> --json` | Delete a task |

Repo: https://github.com/Nardjo/google-tasks-cli
