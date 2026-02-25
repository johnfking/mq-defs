import * as vscode from 'vscode';
import * as path from 'path';

export type Definition = {
   Name: string
   ETagKey: () => string
   FileName: () => string
   CurrentBranch: (config: vscode.WorkspaceConfiguration) => string
   RepositoryUrl: (branch: string) => string
   StoragePath: (globalStoragePath: string, branch: string) => string
};

export type InitializationTarget = {
   definition: Definition
   commandKeyword: 'core.download' | 'plugins.download'
};

export function buildStoragePath(globalStoragePath: string, sourceFolder: string, extractedFolder: string): string {
   return path.join(globalStoragePath, 'file-downloader-downloads', sourceFolder, extractedFolder);
}

export function mergeLibraryPath(library: string[], libraryPath: string): { updated: string[]; changed: boolean } {
   if (library.includes(libraryPath)) {
      return { updated: library, changed: false };
   }

   return { updated: [...library, libraryPath], changed: true };
}

export function shouldShowOptionalNotifications(limitNotifications: boolean): boolean {
   return !limitNotifications;
}

export function buildCommandId(commandKeyword: InitializationTarget['commandKeyword']): string {
   return `mq-defs.${commandKeyword}`;
}

export function getInitializationTargets(config: vscode.WorkspaceConfiguration, definitions: InitializationTarget[]): InitializationTarget[] {
   return definitions.filter(({ definition }) => definition.CurrentBranch(config) !== '');
}
