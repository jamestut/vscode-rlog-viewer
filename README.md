# Rlog Viewer

Rlog Viewer opens JSON from `.rlog` request logs in a formatted, read-only editor tab.

## Install

Copy or symlink this directory into your VS Code extensions directory, usually `~/.vscode/extensions/rlog-viewer`, and restart VS Code.

## Use

Open a `.rlog` file and click **Open formatted JSON** above a request body, log metadata, JSON response body, or SSE event. Non-JSON values stay in the log without a link. Enable Code Lens in VS Code if the links do not appear.

Request bodies, metadata, and JSON response bodies must each be on the line immediately after their section marker. SSE events can have multiple `data:` lines.

## Development

Open this directory in VS Code and run the **Run Rlog Viewer** debug configuration to launch an Extension Development Host. The configuration opens `.vscode/reference-logs.code-workspace`, an optional, Git-ignored file for your local log directories. Create it with your own folder paths if you want those logs available in the development host:

```json
{
  "folders": [
    { "path": "/path/to/logs" }
  ]
}
```

If you do not need a reference workspace, remove its path from the `args` array in `.vscode/launch.json` before starting the debug configuration.

The extension uses JavaScript directly, so there is no compilation step. To package it as a VSIX file, install Node.js and npm, then run this command from the project directory:

```sh
npx @vscode/vsce package
```
