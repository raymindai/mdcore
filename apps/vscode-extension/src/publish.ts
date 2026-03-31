import * as vscode from "vscode";
import * as path from "path";

interface PublishRecord {
  id: string;
  editToken: string;
  url: string;
  publishedAt: string;
}

/** Key used to store publish records in workspace state. Maps file URI -> PublishRecord. */
const STATE_KEY = "mdfy.publishedDocs";

function getApiBaseUrl(): string {
  const config = vscode.workspace.getConfiguration("mdfy");
  return config.get<string>("apiBaseUrl", "https://mdfy.cc");
}

function getPublishRecord(
  context: vscode.ExtensionContext,
  fileUri: string
): PublishRecord | undefined {
  const records =
    context.workspaceState.get<Record<string, PublishRecord>>(STATE_KEY) || {};
  return records[fileUri];
}

function setPublishRecord(
  context: vscode.ExtensionContext,
  fileUri: string,
  record: PublishRecord
): void {
  const records =
    context.workspaceState.get<Record<string, PublishRecord>>(STATE_KEY) || {};
  records[fileUri] = record;
  context.workspaceState.update(STATE_KEY, records);
}

/**
 * Publish a new document to mdfy.cc
 */
export async function publishDocument(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument
): Promise<void> {
  const markdown = document.getText();
  if (!markdown.trim()) {
    vscode.window.showWarningMessage("Document is empty.");
    return;
  }

  const baseUrl = getApiBaseUrl();
  const title = extractTitle(markdown, document.fileName);

  // Check if already published
  const existing = getPublishRecord(context, document.uri.toString());
  if (existing) {
    const choice = await vscode.window.showInformationMessage(
      `This file was already published to ${existing.url}. Publish as a new document?`,
      "Publish New",
      "Update Existing",
      "Cancel"
    );
    if (choice === "Update Existing") {
      return updateDocument(context, document);
    }
    if (choice === "Cancel" || !choice) {
      return;
    }
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Publishing to mdfy.cc...",
      cancellable: false,
    },
    async () => {
      try {
        const response = await fetch(`${baseUrl}/api/docs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown, title }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(
            (error as { error?: string }).error ||
              `HTTP ${response.status}`
          );
        }

        const data = (await response.json()) as {
          id: string;
          editToken: string;
        };
        const docUrl = `${baseUrl}/${data.id}`;

        // Store record for future updates
        setPublishRecord(context, document.uri.toString(), {
          id: data.id,
          editToken: data.editToken,
          url: docUrl,
          publishedAt: new Date().toISOString(),
        });

        const action = await vscode.window.showInformationMessage(
          `Published to ${docUrl}`,
          "Copy URL",
          "Open in Browser"
        );

        if (action === "Copy URL") {
          await vscode.env.clipboard.writeText(docUrl);
          vscode.window.showInformationMessage("URL copied to clipboard.");
        } else if (action === "Open in Browser") {
          vscode.env.openExternal(vscode.Uri.parse(docUrl));
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        vscode.window.showErrorMessage(
          `Failed to publish: ${message}`
        );
      }
    }
  );
}

/**
 * Update an existing document on mdfy.cc
 */
export async function updateDocument(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument
): Promise<void> {
  const record = getPublishRecord(context, document.uri.toString());
  if (!record) {
    const choice = await vscode.window.showInformationMessage(
      "This file hasn't been published yet. Publish it now?",
      "Publish",
      "Cancel"
    );
    if (choice === "Publish") {
      return publishDocument(context, document);
    }
    return;
  }

  const markdown = document.getText();
  if (!markdown.trim()) {
    vscode.window.showWarningMessage("Document is empty.");
    return;
  }

  const baseUrl = getApiBaseUrl();
  const title = extractTitle(markdown, document.fileName);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Updating on mdfy.cc...",
      cancellable: false,
    },
    async () => {
      try {
        const response = await fetch(`${baseUrl}/api/docs/${record.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            editToken: record.editToken,
            markdown,
            title,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(
            (error as { error?: string }).error ||
              `HTTP ${response.status}`
          );
        }

        // Update timestamp
        setPublishRecord(context, document.uri.toString(), {
          ...record,
          publishedAt: new Date().toISOString(),
        });

        const action = await vscode.window.showInformationMessage(
          `Updated: ${record.url}`,
          "Copy URL",
          "Open in Browser"
        );

        if (action === "Copy URL") {
          await vscode.env.clipboard.writeText(record.url);
          vscode.window.showInformationMessage("URL copied to clipboard.");
        } else if (action === "Open in Browser") {
          vscode.env.openExternal(vscode.Uri.parse(record.url));
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        vscode.window.showErrorMessage(
          `Failed to update: ${message}`
        );
      }
    }
  );
}

/**
 * Extract a title from the markdown content (first H1) or fall back to filename.
 */
function extractTitle(markdown: string, filePath: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }
  return path.basename(filePath, path.extname(filePath));
}
