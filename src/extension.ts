import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { getApi, FileDownloader } from "@microsoft/vscode-file-downloader-api";

export function activate(context: vscode.ExtensionContext) {

	console.log('MacroQuest Definition Downloader Active.');
	let disposable = vscode.commands.registerCommand('mq-defs.helloWorld', async () => {
		vscode.window.showInformationMessage('Downloading MacroQuest Lua Defintions.');
      const fileDownloader: FileDownloader = await getApi();
      try {
         await fileDownloader.downloadFile(
            Uri.parse('https://github.com/macroquest/mq-definitions/archive/refs/heads/master.zip'),
            'macroquest',
            context,
            /* cancellationToken */ undefined,
            /* progressCallback */ undefined,
            { shouldUnzip: true });
      }
      catch (error) {
         console.error(error);
         throw error;
      }

      // Updates the Lua.workspace.libray setting
      const globalStoragePath = context.globalStorageUri.fsPath;
      const config = vscode.workspace.getConfiguration('Lua');
      const library = config.get<string[]>('workspace.library') || [];
      const libraryPath = globalStoragePath + '\\test\\mq-definitions-master';
      if (!library.includes(libraryPath)) {
         library.push(libraryPath);
         config.update('workspace.library', library, vscode.ConfigurationTarget.Global);
         vscode.window.showInformationMessage('The Lua Language Server settings have been updated to use the installed MacroQuest Lua Definitions.');
      } else {
         vscode.window.showInformationMessage('The Lua Language Server settings are already configured to use the installed MacroQuest Lua Definitions.');
      }

   });
	context.subscriptions.push(disposable);
}

export function deactivate() {}
