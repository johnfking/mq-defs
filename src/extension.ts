import * as vscode from 'vscode';
import axios from 'axios';
import { Uri } from 'vscode';
import { getApi, FileDownloader } from "@microsoft/vscode-file-downloader-api";
import { Definition, buildStoragePath, mergeLibraryPath, shouldShowOptionalNotifications } from './definitions';

const mqDefinitions: Definition = {
   Name: "MacroQuest Lua Definitions",
   SHAKey: () => "shaKey",
   FileName: () => "macroquest",
   CurrentBranch: (config: vscode.WorkspaceConfiguration) => config.get<string>('branch', 'master'),
   ShaUrl: (branch: string) => `https://api.github.com/repos/macroquest/mq-definitions/commits/${branch}`,
   RepositoryUrl: (branch: string) => `https://github.com/macroquest/mq-definitions/archive/refs/heads/${branch}.zip`,
   StoragePath: (globalStoragePath: string, branch: string) => buildStoragePath(globalStoragePath, 'macroquest', `mq-definitions-${branch}`)
};

let notifications: boolean;

async function checkForUpdates(config: vscode.WorkspaceConfiguration, definition: Definition): Promise<{update: boolean, latestSHA: string}> {
   const shaKey = definition.SHAKey();
   const storedSHA = config.get<string>(shaKey, '');

   // We ask the users if they want to limit notifications, but in code its easier to think the opposite.
   notifications = shouldShowOptionalNotifications(vscode.workspace.getConfiguration().get<boolean>('mq-defs.limit-notifications', true));

   vscode.window.showInformationMessage(`Checking for new ${definition.Name}.`);

   try {
      const branch = definition.CurrentBranch(config);
      const response = await axios.get(`${definition.ShaUrl(branch)}`, {
         headers: { 'User-Agent': 'VSCode Extension' },
         validateStatus: status => status === 200
      });

      const latestSHA = response.data.sha as string;
      if (latestSHA === storedSHA) {
         console.log('No update needed.');
         return { update: false, latestSHA: storedSHA };
      }

      return { update: true, latestSHA };
   } catch (error) {
      console.error('Error checking for updates: ', error);
      return { update: false, latestSHA: storedSHA };
   }
}

async function updateDefinitions(context: vscode.ExtensionContext, config: vscode.WorkspaceConfiguration, definition: Definition, latestSHA: string) {
   console.log('MacroQuest Definition Downloader Active.');
   const shaKey = definition.SHAKey();
   const branch = definition.CurrentBranch(config);

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

      // Update the stored SHA
      config.update(shaKey, latestSHA, vscode.ConfigurationTarget.Global);
      config.update(shaKey, latestSHA, vscode.ConfigurationTarget.Workspace);
      config.update(shaKey, latestSHA, vscode.ConfigurationTarget.WorkspaceFolder);
   }
   catch (error) {
      console.error(error);
      throw error;
   }

   // Updates the Lua.workspace.library setting
   const globalStoragePath = context.globalStorageUri.fsPath;
   const luaConfig = vscode.workspace.getConfiguration('Lua');
   const lsSetting = 'workspace.library';
   const library = luaConfig.get<string[]>(lsSetting) || [];
   const libraryPath = definition.StoragePath(globalStoragePath, branch);
   const mergedLibrary = mergeLibraryPath(library, libraryPath);
   if (mergedLibrary.changed) {
      luaConfig.update(lsSetting, mergedLibrary.updated, vscode.ConfigurationTarget.Global);
      luaConfig.update(lsSetting, mergedLibrary.updated, vscode.ConfigurationTarget.Workspace);
      luaConfig.update(lsSetting, mergedLibrary.updated, vscode.ConfigurationTarget.WorkspaceFolder);
      vscode.window.showInformationMessage(`The Lua Language Server settings have been updated to use the installed ${definition.Name}.`);
   } else {
      if (notifications) {
         vscode.window.showInformationMessage(`The Lua Language Server settings are already configured to use the installed ${definition.Name}.`);
      }
   }
}

async function checkAndUpdate(context: vscode.ExtensionContext, config: vscode.WorkspaceConfiguration, definition: Definition) {
   const doUpdateResult = await checkForUpdates(config, definition);
   if (doUpdateResult.update) {
      try {
         await updateDefinitions(context, config, definition, doUpdateResult.latestSHA);
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

   // Initialize notifications setting
   notifications = shouldShowOptionalNotifications(config.get<boolean>('limit-notifications', true));

   if (mqDefinitions.CurrentBranch(config) === '') {
      vscode.window.showWarningMessage('Please configure the MQ Definitions branch in your settings.');
   } else {
      if (notifications) {
         vscode.window.showInformationMessage('Selected branch for MQ Definitions: ' + mqDefinitions.CurrentBranch(config));
      }
   }

   if (mqDefinitions.CurrentBranch(config) !== '') {
      await initialCheckAndRegisterCommand(context, config, mqDefinitions, 'download');
   }
}

export function deactivate() { }

// Export for testing
export { checkForUpdates, updateDefinitions, mqDefinitions };