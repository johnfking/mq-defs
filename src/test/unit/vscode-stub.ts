// Stub module for vscode in unit tests
import * as sinon from 'sinon';

export enum ConfigurationTarget {
   Global = 1,
   Workspace = 2,
   WorkspaceFolder = 3
}

export class Uri {
   constructor(public value: string) {}

   static parse(value: string): Uri {
      return new Uri(value);
   }

   toString(): string {
      return this.value;
   }
}

export const workspace = {
   getConfiguration: sinon.stub()
};

export const window = {
   showInformationMessage: sinon.stub(),
   showWarningMessage: sinon.stub(),
   showErrorMessage: sinon.stub()
};

export interface WorkspaceConfiguration {
   get<T>(section: string, defaultValue?: T): T | undefined;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   update(section: string, value: any, configurationTarget?: ConfigurationTarget): Thenable<void>;
}

export interface ExtensionContext {
   globalStorageUri: Uri;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   subscriptions: any[];
}
