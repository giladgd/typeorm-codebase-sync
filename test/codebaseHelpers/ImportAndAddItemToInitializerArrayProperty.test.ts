import {fileURLToPath} from "url";
import fs from "fs";
import path from "path";
import {spawnSync} from "child_process";
import {expect} from "chai";
import {getRelativeImportPath} from "../../src/utils/getRelativeImportPath.js";
import {ImportAndAddItemToInitializerArrayProperty} from "../../src/codebaseHelpers/ImportAndAddItemToInitializerArrayProperty.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Update DataSource initializer in data-source.ts file", () => {
    const testDir = path.join(__dirname, "testImportAndAddItemToInitializerArrayProperty");

    function rmdirSync(dir: string){
        if (fs.rmSync != null)
            fs.rmSync(dir, {recursive: true});
        else
            fs.rmdirSync(dir, {recursive: true});
    }

    function runCommand(cwd: string, bin: string, args: string[]) {
        const res = spawnSync(bin, args, {
            cwd: cwd,
            env: process.env,
            stdio: "inherit"
        });

        expect(res.status).to.equal(0);
    }

    async function addEntityToDataSource ({dataSourceFilePath, entityName, entityPath}: {
        dataSourceFilePath: string, entityName: string, entityPath: string
    }) {
        const codebaseUpdater = new ImportAndAddItemToInitializerArrayProperty({
            filePath: dataSourceFilePath,
            initializerName: "DataSource",
            initializerPropertyName: "entities",
            importedFilePath: entityPath,
            importedFileImportName: entityName,
            importedFileExportName: entityName,
            importDefault: false,
            updateOtherRelevantFiles: true,
            treatImportNamespaceAsList: true,
            exportImportAllFromFileWhenImportingNamespace: true,
            treatObjectLiteralExpressionValuesAsList: true,
            instantiateObjectLiteralExpressionValuesByDefault: true
        });

        await codebaseUpdater.manipulateCodebase();
    }

    function createDir(dirPath: string) {
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, {recursive: true});
    }

    function writeFile(filePath: string, content: string) {
        createDir(path.dirname(filePath));
        fs.writeFileSync(filePath, content, "utf8");
    }

    function runTsFile(filePath: string, tsCode: string) {
        writeFile(filePath, tsCode);
        runCommand(testDir, "node", ["--loader=ts-node/esm", "--no-warnings", filePath]);
    }

    async function testContainedDataSourceFile(entityName: string = "User", dataSourceCode: string, testCode: string) {
        const entitiesFolder = "entities";
        const dataSourceFile = "data-source.ts";
        const entityFile = entityName + ".ts";

        const dataSourceFilePath = path.join(testDir, dataSourceFile);
        writeFile(dataSourceFilePath, `
            class DataSource {
                public options: any;
                
                public constructor(options: any) {
                    this.options = options;
                }
            }

            ${dataSourceCode}
        `);

        const entityFilePath = path.join(testDir, entitiesFolder, entityFile);
        writeFile(entityFilePath, `
            export class ${entityName} {
                id!: number;
            }
        `);

        await addEntityToDataSource({
            dataSourceFilePath,
            entityName,
            entityPath: entityFilePath
        });

        const checkFilePath = path.join(testDir, "check.ts");
        runTsFile(checkFilePath, `
            import { expect } from "chai";
            import * as dataSourceResult from ${JSON.stringify(getRelativeImportPath(checkFilePath, dataSourceFilePath, "esm"))};

            expect(dataSourceResult).to.haveOwnProperty("AppDataSource");
            expect(dataSourceResult.AppDataSource).to.haveOwnProperty("options");
            expect(dataSourceResult.AppDataSource.options).to.haveOwnProperty("entities");

            ${testCode}
        `);
    }

    async function testContainedDataSourceFileWithArrayEntities(
        dataSourceCode: string
    ) {
        const entityName = "User";
        await testContainedDataSourceFile(entityName, dataSourceCode, `
            const entities: any = dataSourceResult.AppDataSource.options.entities;
            expect(entities).to.be.an("array");
            expect(entities.length).to.be.gt(0);
            expect(entities[entities.length - 1].name).to.be.eq(${JSON.stringify(entityName)});
        `);
    }

    async function testContainedDataSourceFileWithObjectEntities(
        dataSourceCode: string
    ) {
        const entityName = "User";

        await testContainedDataSourceFile(entityName, dataSourceCode, `
            const entities: any = dataSourceResult.AppDataSource.options.entities;
            expect(entities).to.be.an("object");
            const entityNamesList: (string | undefined)[] = Object.values(entities).map((entity: any) => entity?.name);
            expect(entityNamesList.length).to.be.gt(0);
            expect(entityNamesList).to.include(${JSON.stringify(entityName)});
        `);
    }

    async function testDataSourceFileWithLinkToEntitiesInOtherFile({dataSourceCode, files, testCode, entityName = "User"}: {
        dataSourceCode: string, files: { path: string; content: string }[], testCode: string, entityName?: string
    }) {
        const entitiesFolder = "entities";
        const dataSourceFile = "data-source.ts";
        const entityFile = entityName + ".ts";

        const dataSourceFilePath = path.join(testDir, dataSourceFile);
        writeFile(dataSourceFilePath, `
            class DataSource {
                public options: any;
                
                public constructor(options: any) {
                    this.options = options;
                }
            }

            ${dataSourceCode}
        `);

        for (const file of files)
            writeFile(path.join(testDir, file.path), file.content);

        const entityFilePath = path.join(testDir, entitiesFolder, entityFile);
        writeFile(entityFilePath, `
            export class ${entityName} {
                id!: number;
            }
        `);

        await addEntityToDataSource({
            dataSourceFilePath,
            entityName,
            entityPath: entityFilePath
        });

        const checkFilePath = path.join(testDir, "check.ts");
        runTsFile(checkFilePath, `
            import { expect } from "chai";
            import * as dataSourceResult from ${JSON.stringify(getRelativeImportPath(checkFilePath, dataSourceFilePath, "esm"))};

            expect(dataSourceResult).to.haveOwnProperty("AppDataSource");
            expect(dataSourceResult.AppDataSource).to.haveOwnProperty("options");
            expect(dataSourceResult.AppDataSource.options).to.haveOwnProperty("entities");

            ${testCode}
        `);
    }

    beforeEach(() => {
        if (fs.existsSync(testDir)) rmdirSync(testDir);
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) rmdirSync(testDir);
    });

    describe("adds an import to the entity in data-source.ts - array", async () => {
        it("array literal expression", async () => {
            await testContainedDataSourceFileWithArrayEntities(`
                export const AppDataSource = new DataSource({
                    type: "sqlite",
                    database: "database.db",
                    entities: []
                });
            `);
        });

        it("variable declaration", async () => {
            await testContainedDataSourceFileWithArrayEntities(`
                class Model {}

                const entities = [Model];

                export const AppDataSource = new DataSource({
                    type: "sqlite",
                    database: "database.db",
                    entities: entities
                });
            `);
        });

        it("variable declaration - shorthand property assignment", async () => {
            await testContainedDataSourceFileWithArrayEntities(`
                class Model {}

                const entities = [Model];

                export const AppDataSource = new DataSource({
                    type: "sqlite",
                    database: "database.db",
                    entities
                });
            `);
        });
    });

    describe("adds an import to the entity in data-source.ts when using entity:create - object", async () => {
        it("object literal expression", async () => {
            await testContainedDataSourceFileWithObjectEntities(`
                export const AppDataSource = new DataSource({
                    type: "sqlite",
                    database: "database.db",
                    entities: {}
                });
            `);
        });

        it("variable declaration", async () => {
            await testContainedDataSourceFileWithObjectEntities(`
                class Model {}

                const entities = {Model};

                export const AppDataSource = new DataSource({
                    type: "sqlite",
                    database: "database.db",
                    entities: entities
                });
            `);
        });

        it("variable declaration - shorthand property assignment", async () => {
            await testContainedDataSourceFileWithObjectEntities(`
                class Model {}

                const entities = {Model};

                export const AppDataSource = new DataSource({
                    type: "sqlite",
                    database: "database.db",
                    entities
                });
            `);
        });

        it("omitted", async () => {
            await testContainedDataSourceFileWithObjectEntities(`
                export const AppDataSource = new DataSource({
                    type: "sqlite",
                    database: "database.db"
                });
            `);
        });
    });

    describe("adds an import to the entity in external file used by data-source.ts when using entity:create", async () => {
        const entityName = "User";

        it("external file with exported list", async () => {
            await testDataSourceFileWithLinkToEntitiesInOtherFile({
                entityName,
                dataSourceCode: `
                    import { entities } from "./entities.js"

                    export const AppDataSource = new DataSource({
                        type: "sqlite",
                        database: "database.db",
                        entities: entities
                    });
                `,
                files: [{
                    path: "entities.ts",
                    content: `
                        import { SomeModal } from "./entities/SomeModal.js";

                        export const entities = [
                            SomeModal
                        ];
                    `
                }, {
                    path: "entities/SomeModal.ts",
                    content: `
                        export class SomeModal {}
                    `
                }],
                testCode: `
                    const entities: any = dataSourceResult.AppDataSource.options.entities;
                    expect(entities).to.be.an("array");
                    expect(entities.length).to.be.gt(0);
                    expect(entities[entities.length - 1].name).to.be.eq(${JSON.stringify(entityName)});
                `
            });
        });

        it("external file with default exported variable list", async () => {
            await testDataSourceFileWithLinkToEntitiesInOtherFile({
                entityName,
                dataSourceCode: `
                    import entities from "./entities.js"

                    export const AppDataSource = new DataSource({
                        type: "sqlite",
                        database: "database.db",
                        entities: entities
                    });
                `,
                files: [{
                    path: "entities.ts",
                    content: `
                        import { SomeModal } from "./entities/SomeModal.js";

                        const entities1 = [
                            SomeModal
                        ];
                        
                        export default entities1;
                    `
                }, {
                    path: "entities/SomeModal.ts",
                    content: `
                        export class SomeModal {}
                    `
                }],
                testCode: `
                    const entities: any = dataSourceResult.AppDataSource.options.entities;
                    expect(entities).to.be.an("array");
                    expect(entities.length).to.be.gt(0);
                    expect(entities[entities.length - 1].name).to.be.eq(${JSON.stringify(entityName)});
                `
            });
        });

        it("external file with default exported list", async () => {
            await testDataSourceFileWithLinkToEntitiesInOtherFile({
                entityName,
                dataSourceCode: `
                    import entities from "./entities.js"

                    export const AppDataSource = new DataSource({
                        type: "sqlite",
                        database: "database.db",
                        entities: entities
                    });
                `,
                files: [{
                    path: "entities.ts",
                    content: `
                        import { SomeModal } from "./entities/SomeModal.js";

                        export default [
                            SomeModal
                        ];
                    `
                }, {
                    path: "entities/SomeModal.ts",
                    content: `
                        export class SomeModal {}
                    `
                }],
                testCode: `
                    const entities: any = dataSourceResult.AppDataSource.options.entities;
                    expect(entities).to.be.an("array");
                    expect(entities.length).to.be.gt(0);
                    expect(entities[entities.length - 1].name).to.be.eq(${JSON.stringify(entityName)});
                `
            });
        });

        it("external file with default exported variable object", async () => {
            await testDataSourceFileWithLinkToEntitiesInOtherFile({
                entityName,
                dataSourceCode: `
                    import entities from "./entities.js"

                    export const AppDataSource = new DataSource({
                        type: "sqlite",
                        database: "database.db",
                        entities: entities
                    });
                `,
                files: [{
                    path: "entities.ts",
                    content: `
                        import { SomeModal } from "./entities/SomeModal.js";

                        const entities1 = {
                            SomeModal
                        };
                        
                        export default entities1;
                    `
                }, {
                    path: "entities/SomeModal.ts",
                    content: `
                        export class SomeModal {}
                    `
                }],
                testCode: `
                    const entities: any = dataSourceResult.AppDataSource.options.entities;
                    expect(entities).to.be.an("object");
                    const entityNamesList: (string | undefined)[] = Object.values(entities).map((entity: any) => entity?.name);
                    expect(entityNamesList.length).to.be.gt(0);
                    expect(entityNamesList).to.include(${JSON.stringify(entityName)});
                `
            });
        });

        it("external file with default exported object", async () => {
            await testDataSourceFileWithLinkToEntitiesInOtherFile({
                entityName,
                dataSourceCode: `
                    import entities from "./entities.js"

                    export const AppDataSource = new DataSource({
                        type: "sqlite",
                        database: "database.db",
                        entities: entities
                    });
                `,
                files: [{
                    path: "entities.ts",
                    content: `
                        import { SomeModal } from "./entities/SomeModal.js";

                        export default {
                            SomeModal
                        };
                    `
                }, {
                    path: "entities/SomeModal.ts",
                    content: `
                        export class SomeModal {}
                    `
                }],
                testCode: `
                    const entities: any = dataSourceResult.AppDataSource.options.entities;
                    expect(entities).to.be.an("object");
                    const entityNamesList: (string | undefined)[] = Object.values(entities).map((entity: any) => entity?.name);
                    expect(entityNamesList.length).to.be.gt(0);
                    expect(entityNamesList).to.include(${JSON.stringify(entityName)});
                `
            });
        });

        it("external file with exported list - shorthand property assignment", async () => {
            await testDataSourceFileWithLinkToEntitiesInOtherFile({
                entityName,
                dataSourceCode: `
                    import { entities } from "./entities.js"

                    export const AppDataSource = new DataSource({
                        type: "sqlite",
                        database: "database.db",
                        entities
                    });
                `,
                files: [{
                    path: "entities.ts",
                    content: `
                        import { SomeModal } from "./entities/SomeModal.js";

                        export const entities = [
                            SomeModal
                        ];
                    `
                }, {
                    path: "entities/SomeModal.ts",
                    content: `
                        export class SomeModal {}
                    `
                }],
                testCode: `
                    const entities: any = dataSourceResult.AppDataSource.options.entities;
                    expect(entities).to.be.an("array");
                    expect(entities.length).to.be.gt(0);
                    expect(entities[entities.length - 1].name).to.be.eq(${JSON.stringify(entityName)});
                `
            });
        });

        it("external file with exported object", async () => {
            await testDataSourceFileWithLinkToEntitiesInOtherFile({
                entityName,
                dataSourceCode: `
                    import { entities } from "./entities.js"

                    export const AppDataSource = new DataSource({
                        type: "sqlite",
                        database: "database.db",
                        entities: entities
                    });
                `,
                files: [{
                    path: "entities.ts",
                    content: `
                        import { SomeModal } from "./entities/SomeModal.js";

                        export const entities = {
                            SomeModal
                        };
                    `
                }, {
                    path: "entities/SomeModal.ts",
                    content: `
                        export class SomeModal {}
                    `
                }],
                testCode: `
                    const entities: any = dataSourceResult.AppDataSource.options.entities;
                    expect(entities).to.be.an("object");
                    const entityNamesList: (string | undefined)[] = Object.values(entities).map((entity: any) => entity?.name);
                    expect(entityNamesList.length).to.be.gt(0);
                    expect(entityNamesList).to.include(${JSON.stringify(entityName)});
                `
            });
        });

        it("external file with exported imports", async () => {
            await testDataSourceFileWithLinkToEntitiesInOtherFile({
                entityName,
                dataSourceCode: `
                    import * as entities from "./entities.js"

                    export const AppDataSource = new DataSource({
                        type: "sqlite",
                        database: "database.db",
                        entities: entities
                    });
                `,
                files: [{
                    path: "entities.ts",
                    content: `
                        export { SomeModal } from "./entities/SomeModal.js";
                    `
                }, {
                    path: "entities/SomeModal.ts",
                    content: `
                        export class SomeModal {}
                    `
                }],
                testCode: `
                    const entities: any = dataSourceResult.AppDataSource.options.entities;
                    const entityNamesList: (string | undefined)[] = Object.values(entities).map((entity: any) => entity?.name);
                    expect(entityNamesList.length).to.be.gt(0);
                    expect(entityNamesList).to.include(${JSON.stringify(entityName)});
                `
            });
        });
    });
});
