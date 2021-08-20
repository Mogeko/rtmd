import * as vscode from 'vscode';
import Muya from 'muya';

export class MuyaEditorProvider implements vscode.CustomTextEditorProvider {

  //Register our editor type
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
	  return vscode.window.registerCustomEditorProvider(
      MuyaEditorProvider.viewType,
      new MuyaEditorProvider(context)
    );
  }

  private static readonly viewType = 'mogeko.muyaEditor';

  constructor(
    private readonly context: vscode.ExtensionContext
  ) { }

  /**
   * Called when our custom editor is opened.
   * 
   * 
   */
  public async resolveCustomTextEditor(
      document: vscode.TextDocument,
      webviewPanel: vscode.WebviewPanel,
      _token: vscode.CancellationToken
  ): Promise<void> {
    // Setup initial content for the webview
	  webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Listen for changes to the document
    const updateWebview = () => {
      webviewPanel.webview.postMessage({
        type: 'update',
        content: document.getText(),
      });
    };

    // sync change in the document to our editor
    // and sync changes in the editor back to the document.
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				updateWebview();
			}
		});

    // Make sure we get rid of the listener when our editor is closed.
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});
  
    // Receive message from the webview.
		// webviewPanel.webview.onDidReceiveMessage(e => {
    //   if (e.type === 'add') {
    //     this.addNewScratch(document);
    //   } else if (e.type === 'delete') {
    //     this.deleteScratch(document, e.id);
    //   }
		// });

    updateWebview();
  }

  /**
	 * Get the static html used for the editor webviews.
	 */

  private getHtmlForWebview(webview: vscode.Webview): string {
    // Local path to script and css for the webview
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(
      this.context.extensionUri, 'assets', 'reset.css')
    );

		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
      this.context.extensionUri, 'assets', 'vscode.css')
    );

    // Use a nonce to whitelist which scripts can be run
    const nonce = this.getNonce();

    return /* html */`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="${styleResetUri}" rel="stylesheet" />
			<link href="${styleVSCodeUri}" rel="stylesheet" />
      <title>Muya Editor</title>
    </head>
    <body>
      <div id="editor"></div>
      <script nonce="${nonce}"></script>
    </body>
    </html>
    `;
  }

  /**
	 * Add a new scratch to the current document.
	 */
	private addNewScratch(document: vscode.TextDocument) {
		const json = this.getDocumentAsJson(document);
		// const character = MuyaEditorProvider.scratchCharacters[Math.floor(Math.random() * CatScratchEditorProvider.scratchCharacters.length)];
		json.scratches = [
			...(Array.isArray(json.scratches) ? json.scratches : []),
      {
				id: this.getNonce(),
				// text: character,
				created: Date.now(),
			}
		];

		return this.updateTextDocument(document, json);
	}

	/**
	 * Delete an existing scratch from a document.
	 */
	private deleteScratch(document: vscode.TextDocument, id: string) {
		const json = this.getDocumentAsJson(document);
		if (!Array.isArray(json.scratches)) {
			return;
		}

		json.scratches = json.scratches.filter((note: any) => note.id !== id);

		return this.updateTextDocument(document, json);
	}

  /**
	 * Try to get a current document as json text.
	 */
	private getDocumentAsJson(document: vscode.TextDocument): any {
		const text = document.getText();
		if (text.trim().length === 0) {
			return {};
		}

		try {
			return JSON.parse(text);
		} catch {
			throw new Error('Could not get document as json. Content is not valid json');
		}
	}

  /**
	 * Write out the json to a given document.
	 */
	private updateTextDocument(document: vscode.TextDocument, json: any) {
		const edit = new vscode.WorkspaceEdit();

		// Just replace the entire document every time for this example extension.
		// A more complete extension should compute minimal edits instead.
		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount, 0),
			JSON.stringify(json, null, 2)
    );

		return vscode.workspace.applyEdit(edit);
	}

  /**
   * Generate a random string for Nonce
   */
  private getNonce() {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return [...Array(32).keys()].map(
      () => possible.charAt(Math.floor(Math.random() * possible.length))
    ).join('');
  }
}
