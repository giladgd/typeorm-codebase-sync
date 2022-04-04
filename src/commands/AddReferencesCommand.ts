import path from "path";
import chalk from "chalk";
import yargs from "yargs";
import {resolveClassFileAndImportGlobs, ResolvedFileImport} from "../codebaseHelpers/resolveClassFileAndImportGlobs.js";
import {ImportAndAddItemToInitializerArrayProperty} from "../codebaseHelpers/ImportAndAddItemToInitializerArrayProperty.js";

export class AddReferencesCommand implements yargs.CommandModule<object, commandArgs> {
    command = "addReferences";
    describe = "Add references in the data-source.ts file to the provided migrations, entities and subscribers";

    cwd = process.cwd();

    constructor() {
        this.builder = this.builder.bind(this);
        this.handler = this.handler.bind(this);
    }

    builder(args: yargs.Argv) {
        return args
            .usage(`Usage: $0 ${this.command} --dataSource <path> [options]`)
            .option("dataSource", {
                alias: "d",
                type: "string",
                describe: "Path to a data-source.ts file",
                demandOption: true,
                group: "Required:"
            })
            .option("migrations", {
                alias: "m",
                type: "string",
                array: true,
                describe: "Glob of migration files or folders containing migration files",
                demandOption: false,
                group: "Files:"
            })
            .option("entities", {
                alias: "e",
                type: "string",
                array: true,
                describe: "Glob of entity files or folders containing entity files",
                demandOption: false,
                group: "Files:"
            })
            .option("subscribers", {
                alias: "s",
                type: "string",
                array: true,
                describe: "Glob of subscriber files or folders containing subscriber files",
                demandOption: false,
                group: "Files:"
            });
    }

    async handler(args: commandArgs) {
        const cwd = this.cwd;
        let addedMigrationFiles: string[] = [];
        let addedEntityFiles: string[] = [];
        let addedSubscriberFiles: string[] = [];

        const dataSource = path.resolve(cwd, args.dataSource);

        if (args.migrations != null) {
            const {
                updatedFiles, addedImportedFiles
            } = await this.updateProperty(dataSource, "migrations", await resolveClassFileAndImportGlobs(cwd, args.migrations));

            addedMigrationFiles = updatedFiles;
            this.logImportAdditions("migration", cwd, addedImportedFiles);
        }

        if (args.entities != null) {
            const {
                updatedFiles, addedImportedFiles
            } = await this.updateProperty(dataSource, "entities", await resolveClassFileAndImportGlobs(cwd, args.entities));

            addedEntityFiles = updatedFiles;
            this.logImportAdditions("entity", cwd, addedImportedFiles);
        }

        if (args.subscribers != null) {
            const {
                updatedFiles, addedImportedFiles
            } = await this.updateProperty(dataSource, "subscribers", await resolveClassFileAndImportGlobs(cwd, args.subscribers));

            addedSubscriberFiles = updatedFiles;
            this.logImportAdditions("subscriber", cwd, addedImportedFiles);
        }

        const updatedFiles = new Set<string>([
            ...addedMigrationFiles,
            ...addedEntityFiles,
            ...addedSubscriberFiles
        ]);
        if (updatedFiles.size === 0)
            console.log(chalk.yellow("No files were updated"));
        else {
            for (const updatedFile of updatedFiles)
                console.log(chalk.green("Updated ") + chalk.blue(path.relative(cwd, updatedFile)));
        }
    }

    async updateProperty(
        dataSourceFilePath: string, propertyName: "migrations" | "entities" | "subscribers", addedImports: ResolvedFileImport[]
    ) {
        let updatedFiles: string[] = [];
        const addedImportedFiles: string[] = [];
        for (const addedImport of addedImports) {
            const importUpdatedFiles = await this.addImportToProperty(dataSourceFilePath, propertyName, addedImport);
            updatedFiles = updatedFiles.concat(importUpdatedFiles);

            if (importUpdatedFiles.length > 0)
                addedImportedFiles.push(addedImport.filePath);
        }

        return {
            updatedFiles,
            addedImportedFiles
        };
    }

    async addImportToProperty(
        dataSourceFilePath: string, propertyName: "migrations" | "entities" | "subscribers", addedImport: ResolvedFileImport
    ) {
        const codeUpdater = new ImportAndAddItemToInitializerArrayProperty({
            filePath: dataSourceFilePath,
            initializerName: "DataSource",
            initializerPropertyName: propertyName,
            importedFilePath: addedImport.filePath,
            importedFileImportName: addedImport.importName,
            importedFileExportName: addedImport.exportName,
            importDefault: addedImport.importDefault,
            updateOtherRelevantFiles: true,
            treatImportNamespaceAsList: true,
            exportImportAllFromFileWhenImportingNamespace: true,
            treatObjectLiteralExpressionValuesAsList: true,
            instantiateObjectLiteralExpressionValuesByDefault: true
        });

        const updatedFiles = await codeUpdater.manipulateCodebase();

        return updatedFiles;
    }

    logImportAdditions(additionName: "migration" | "entity" | "subscriber", cwd: string, filePaths: string[]) {
        for (const file of filePaths) {
            const relativePath = path.relative(cwd, file);
            console.log(chalk.green(`Added ${additionName} `) + chalk.blue(relativePath));
        }
    }
}

type commandArgs = {
    dataSource: string,
    migrations?: string[],
    entities?: string[],
    subscribers?: string[]
};
