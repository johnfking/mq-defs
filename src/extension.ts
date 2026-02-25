import * as vscode from 'vscode';
import axios from 'axios';
import { Uri } from 'vscode';
import { getApi, FileDownloader } from "@microsoft/vscode-file-downloader-api";
import { Definition, buildStoragePath, mergeLibraryPath, shouldShowOptionalNotifications } from './definitions';

const mqDefinitions: Definition = {
   Name: "MacroQuest Lua Definitions",
   ETagKey: () => "etag",
   FileName: () => "macroquest",
   CurrentBranch: (config: vscode.WorkspaceConfiguration) => config.get<string>('branch', ''),
   RepositoryUrl: (branch: string) => `https://github.com/macroquest/mq-definitions/archive/refs/heads/${branch}.zip`,
   StoragePath: (globalStoragePath: string, branch: string) => buildStoragePath(globalStoragePath, 'macroquest', `mq-definitions-${branch}`)
};

const mqPluginDefinitions: Definition = {
   Name: "MacroQuest Plugin Lua Definitions",
   ETagKey: () => "plugins.etag",
   FileName: () => "macroquest-plugin",
   CurrentBranch: (config: vscode.WorkspaceConfiguration) => config.get<string>('plugins.branch', ''),
   RepositoryUrl: (branch: string) => `https://github.com/macroquest/mq-plugin-definitions/archive/refs/heads/${branch}.zip`,
   StoragePath: (globalStoragePath: string, branch: string) => buildStoragePath(globalStoragePath, 'macroquest-plugins', `mq-plugin-definitions-${branch}`)
};

let notifications = false;


async function checkForUpdates(config: vscode.WorkspaceConfiguration, definition: Definition, branch: string): Promise<boolean> {
   const eTagKey = definition.ETagKey();
   const storedETag = config.get<string>(eTagKey, '');

   // We ask the users if they want to limit notifications, but in code its easier to think the opposite.
   notifications = shouldShowOptionalNotifications(vscode.workspace.getConfiguration().get<boolean>('mq-defs.limit-notifications', true));

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
   const mergedLibrary = mergeLibraryPath(library, libraryPath);
   if (mergedLibrary.changed) {
      config.update(lsSetting, mergedLibrary.updated, vscode.ConfigurationTarget.Global);
      config.update(lsSetting, mergedLibrary.updated, vscode.ConfigurationTarget.Workspace);
      config.update(lsSetting, mergedLibrary.updated, vscode.ConfigurationTarget.WorkspaceFolder);
      vscode.window.showInformationMessage(`The Lua Language Server settings have been updated to use the installed ${definition.Name}.`);
   } else {
      if (notifications) {
         vscode.window.showInformationMessage(`The Lua Language Server settings are already configured to use the installed ${definition.Name}.`);
      }
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
      if (notifications) {
         vscode.window.showInformationMessage(`${definition.Name} are up to date.`);
      }
   }
}


async function initialCheckAndRegisterCommand(context: vscode.ExtensionContext, config: vscode.WorkspaceConfiguration, definition: Definition, commandKeyword: string) {
   try {
      await checkAndUpdate(context, config, definition);
   }
   catch (error) {
      console.error(error);
   }

   const disposable = vscode.commands.registerCommand(`mq-defs.${commandKeyword}`, async () => {
      await checkAndUpdate(context, config, definition);
   });

   context.subscriptions.push(disposable);
}

export async function activate(context: vscode.ExtensionContext) {
   const config = vscode.workspace.getConfiguration('mq-defs');

   if (mqDefinitions.CurrentBranch(config) === '') {
      vscode.window.showWarningMessage('Please configure the MQ Definitions branch in your settings.');
   } else {
      if (notifications) {
         vscode.window.showInformationMessage('Selected branch for MQ Definitions: ' + mqDefinitions.CurrentBranch(config));
      }
   }

   if (mqPluginDefinitions.CurrentBranch(config) === '') {
      vscode.window.showWarningMessage('Please configure the MQ Plugins branch in your settings.');
   } else {
      if (notifications) {
         vscode.window.showInformationMessage('Selected branch for MQ Plugin Definitions: ' + mqPluginDefinitions.CurrentBranch(config));
      }
   }


   if (mqDefinitions.CurrentBranch(config) !== '') {
      await initialCheckAndRegisterCommand(context, config, mqDefinitions, 'core.download');
   }

   if (mqPluginDefinitions.CurrentBranch(config) !== '') {
      await initialCheckAndRegisterCommand(context, config, mqPluginDefinitions, 'plugins.download');
   }
}
export function deactivate() { }
