import * as vscode from 'vscode';
import axios from 'axios';
import { Uri } from 'vscode';
import { getApi, FileDownloader } from "@microsoft/vscode-file-downloader-api";

async function checkForUpdates(context: vscode.ExtensionContext, branch: string): Promise<boolean> {
   const repoUrl = `https://github.com/macroquest/mq-definitions/archive/refs/heads/${branch}.zip`;
   const config = vscode.workspace.getConfiguration('mq-defs');
   const storedETag = config.get<string>('etag', '');
   vscode.window.showInformationMessage('Checking for new MacroQuest Lua Defintions.');
   try {
      const response = await axios.get(repoUrl, {
         headers: { 'If-None-Match': storedETag },
         validateStatus: status => status === 200 || status === 304
      });

      if (response.status === 304) {
         console.log('No update needed.');
         return false;
      }

      // Update the stored ETag
      const newETag = response.headers.etag;
      config.update('etag', newETag, vscode.ConfigurationTarget.Global);
      config.update('etag', newETag, vscode.ConfigurationTarget.Workspace);
      config.update('etag', newETag, vscode.ConfigurationTarget.WorkspaceFolder);
      return true;
   } catch (error) {
      console.error('Error checking for updates: ', error);
      return false;
   }
}

async function updateDefinitions(context: vscode.ExtensionContext, branch: string) {
   console.log('MacroQuest Definition Downloader Active.');

   vscode.window.showInformationMessage('Downloading MacroQuest Lua Defintions.');
   const fileDownloader: FileDownloader = await getApi();

   try {
      await fileDownloader.downloadFile(
         Uri.parse(`https://github.com/macroquest/mq-definitions/archive/refs/heads/${branch}.zip`),
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
   const lsSetting = 'workspace.library';
   const library = config.get<string[]>(lsSetting) || [];
   const libraryPath = globalStoragePath + '\\file-downloader-downloads\\macroquest\\mq-definitions-master';
   if (!library.includes(libraryPath)) {
      library.push(libraryPath);
      config.update(lsSetting, library, vscode.ConfigurationTarget.Global);
      config.update(lsSetting, library, vscode.ConfigurationTarget.Workspace);
      config.update(lsSetting, library, vscode.ConfigurationTarget.WorkspaceFolder);
      vscode.window.showInformationMessage('The Lua Language Server settings have been updated to use the installed MacroQuest Lua Definitions.');
   } else {
      vscode.window.showInformationMessage('The Lua Language Server settings are already configured to use the installed MacroQuest Lua Definitions.');
   }

}

export async function activate(context: vscode.ExtensionContext) {

   const currentBranch = vscode.workspace.getConfiguration().get<string>('mq-defs.branch', '');

   if (currentBranch === '') {
      vscode.window.showWarningMessage('Please configure the MQ Definitions branch in your settings.');
   } else {
      vscode.window.showInformationMessage('Selected branch for MQ Definitions: ' + currentBranch);
   }

   // Check for updates on startup
   checkForUpdates(context, currentBranch).then(isUpdatable => {
      if (isUpdatable) {
         updateDefinitions(context, currentBranch).catch(console.error);
      } else {
         vscode.window.showInformationMessage('MacroQuest Lua Definitions are up to date.');
      }
   }).catch(console.error);

   let disposable = vscode.commands.registerCommand('mq-defs.download', async () => {
      checkForUpdates(context, currentBranch).then(isUpdatable => {
         if (isUpdatable) {
            updateDefinitions(context, currentBranch).catch(console.error);
         } else {
            vscode.window.showInformationMessage('MacroQuest Lua Defintions are up to date.');
         }
      });
      context.subscriptions.push(disposable);
   });
}
export function deactivate() { }