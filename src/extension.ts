import * as vscode from 'vscode';
import axios from 'axios';
import { Uri } from 'vscode';
import { getApi, FileDownloader } from "@microsoft/vscode-file-downloader-api";

type Definition = {
   Name: string
   ETagKey: () => string
   FileName: () => string
   Command: () => string
   CurrentBranch: (config: vscode.WorkspaceConfiguration) => string
   RepositoryUrl: (branch: string) => string
   StoragePath: (globalStoragePath: string, branch: string) => string
};

const mqDefinitions: Definition = {
   Name: "MacroQuest Lua Definitions",
   ETagKey: () => "etag",
   FileName: () => "macroquest",
   Command: () => "mq-defs.download",
   CurrentBranch: (config: vscode.WorkspaceConfiguration) => config.get<string>('branch', ''),
   RepositoryUrl: (branch: string) => `https://github.com/macroquest/mq-definitions/archive/refs/heads/${branch}.zip`,
   StoragePath: (globalStoragePath: string, branch: string) => `${globalStoragePath}\\file-downloader-downloads\\macroquest\\mq-definitions-${branch}`
};

const mqPluginDefinitions: Definition = {
   Name: "MacroQuest Plugin Lua Definitions",
   ETagKey: () => "plugins.etag",
   FileName: () => "macroquest-plugin",
   Command: () => "mq-defs.plugins.download",
   CurrentBranch: (config: vscode.WorkspaceConfiguration) => config.get<string>('plugins.branch', ''),
   RepositoryUrl: (branch: string) => `https://github.com/macroquest/mq-plugin-definitions/archive/refs/heads/${branch}.zip`,
   StoragePath: (globalStoragePath: string, branch: string) => `${globalStoragePath}\\file-downloader-downloads\\macroquest-plugins\\mq-plugin-definitions-${branch}`
};


async function checkForUpdates(config: vscode.WorkspaceConfiguration, definition: Definition, branch: string): Promise<boolean> {
   const eTagKey = definition.ETagKey();
   const storedETag = config.get<string>(eTagKey, '');
   vscode.window.showInformationMessage(`Checking for new ${definition.Name}.`);
   
   try {
      const response = await axios.get(definition.RepositoryUrl(branch), {
         headers: { 'If-None-Match': storedETag },
         validateStatus: status => status === 200 || status === 304
      });

      if (response.status === 304) {
         console.log('No update needed.');
         return false;
      }

      // Update the stored ETag
      const newETag = response.headers.etag;
      config.update(eTagKey, newETag, vscode.ConfigurationTarget.Global);
      config.update(eTagKey, newETag, vscode.ConfigurationTarget.Workspace);
      config.update(eTagKey, newETag, vscode.ConfigurationTarget.WorkspaceFolder);
      return true;
   } catch (error) {
      console.error('Error checking for updates: ', error);
      return false;
   }
}

async function updateDefinitions(context: vscode.ExtensionContext, definition: Definition, branch: string) {
   console.log('MacroQuest Definition Downloader Active.');

   vscode.window.showInformationMessage(`Downloading ${definition.Name}.`);
   const fileDownloader: FileDownloader = await getApi();

   try {
      await fileDownloader.downloadFile(
         Uri.parse(definition.RepositoryUrl(branch)),
         definition.FileName(),
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
   const libraryPath = definition.StoragePath(globalStoragePath, branch);
   if (!library.includes(libraryPath)) {
      library.push(libraryPath);
      config.update(lsSetting, library, vscode.ConfigurationTarget.Global);
      config.update(lsSetting, library, vscode.ConfigurationTarget.Workspace);
      config.update(lsSetting, library, vscode.ConfigurationTarget.WorkspaceFolder);
      vscode.window.showInformationMessage(`The Lua Language Server settings have been updated to use the installed ${definition.Name}.`);
   } else {
      vscode.window.showInformationMessage(`The Lua Language Server settings are already configured to use the installed ${definition.Name}.`);
   }
}

async function checkAndUpdate(context: vscode.ExtensionContext, config: vscode.WorkspaceConfiguration, definition: Definition) {
   const doUpdate = await checkForUpdates(config, definition, definition.CurrentBranch(config));
   if (doUpdate) {
      try {
         await updateDefinitions(context, definition, definition.CurrentBranch(config));
      }
      catch (error) {
         console.error(error);
         throw error;
      }
   } else {
      vscode.window.showInformationMessage(`${definition.Name} are up to date.`);
   }
}


async function initialCheckAndRegisrerCommand(context: vscode.ExtensionContext, config: vscode.WorkspaceConfiguration, definition: Definition) {
   try {
      await checkAndUpdate(context, config, definition);
   }
   catch (error) {
      console.error(error);
   }

   let disposable = vscode.commands.registerCommand('mq-defs.download', async () => {
      await checkAndUpdate(context, config, definition);
      context.subscriptions.push(disposable);
   });
}

export async function activate(context: vscode.ExtensionContext) {
   const config = vscode.workspace.getConfiguration('mq-defs');
   if (mqDefinitions.CurrentBranch(config) === '') {
      vscode.window.showWarningMessage('Please configure the MQ Definitions branch in your settings.');
   } else {
      vscode.window.showInformationMessage('Selected branch for MQ Definitions: ' + mqDefinitions.CurrentBranch(config));
   }

   // Check for updates on startup
   await initialCheckAndRegisrerCommand(context, config, mqDefinitions);

   if (mqPluginDefinitions.CurrentBranch(config) !== '') {
      await initialCheckAndRegisrerCommand(context, config, mqPluginDefinitions);
   }
}

export function deactivate() { }