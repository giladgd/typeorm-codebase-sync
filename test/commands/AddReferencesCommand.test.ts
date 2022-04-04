import {fileURLToPath} from "url";
import fs from "fs";
import path from "path";
import {spawnSync} from "child_process";
import {expect} from "chai";
import {getRelativeImportPath} from "../../src/utils/getRelativeImportPath.js";
import {AddReferencesCommand} from "../../src/commands/AddReferencesCommand.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Use AddReferencesCommand to update data-source.ts file", () => {
    const testDir = path.join(__dirname, "testAddReferencesCommand");

    function rmdirSync(dir: string) {
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

    async function testDataSourceFile({dataSourceCode, files, testCode, commandParams}: {
        dataSourceCode: string, files: { path: string; content: string }[], testCode: string, entityName?: string,
        commandParams: Parameters<typeof AddReferencesCommand.prototype.handler>[0]
    }) {
        const dataSourceFile = "data-source.ts";

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

        const command = new AddReferencesCommand();
        command.cwd = testDir;
        await command.handler(commandParams);

        const checkFilePath = path.join(testDir, "check.ts");
        runTsFile(checkFilePath, `
            import { expect } from "chai";
            import * as dataSourceResult from ${JSON.stringify(getRelativeImportPath(checkFilePath, dataSourceFilePath, "esm"))};

            expect(dataSourceResult).to.haveOwnProperty("AppDataSource");
            expect(dataSourceResult.AppDataSource).to.haveOwnProperty("options");

            ${testCode}
        `);
    }

    beforeEach(() => {
        if (fs.existsSync(testDir)) rmdirSync(testDir);
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) rmdirSync(testDir);
    });

    it("should add entities from folder", async () => {
        await testDataSourceFile({
            dataSourceCode: `
                import { entities } from "./entities.js"

                export const AppDataSource = new DataSource({
                    type: "sqlite",
                    database: "database.db",
                    entities: entities
                });
            `,
            commandParams: {
                dataSource: "data-source.ts",
                entities: ["entities"]
            },
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
            }, {
                path: "entities/User.ts",
                content: `
                    export class User {}
                `
            }],
            testCode: `
                expect(dataSourceResult.AppDataSource.options).to.haveOwnProperty("entities");
                
                const entities: any = dataSourceResult.AppDataSource.options.entities;
                expect(entities).to.be.an("array");
                expect(entities.length).to.be.gt(0);
                const entityNames = entities.map((entity: any) => entity.name);
                expect(entityNames).to.include("User");
                expect(entityNames).to.include("SomeModal");
            `
        });
    });

    it("should add entities from multiple folders", async () => {
        await testDataSourceFile({
            dataSourceCode: `
                import { entities } from "./entities.js"

                export const AppDataSource = new DataSource({
                    type: "sqlite",
                    database: "database.db",
                    entities: entities
                });
            `,
            commandParams: {
                dataSource: "data-source.ts",
                entities: ["entities", "entities2"]
            },
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
            }, {
                path: "entities/User.ts",
                content: `
                    export class User {}
                `
            }, {
                path: "entities2/SomeModal2.ts",
                content: `
                    export class SomeModal2 {}
                `
            }, {
                path: "entities2/User2.ts",
                content: `
                    export class User2 {}
                `
            }],
            testCode: `
                expect(dataSourceResult.AppDataSource.options).to.haveOwnProperty("entities");
                
                const entities: any = dataSourceResult.AppDataSource.options.entities;
                expect(entities).to.be.an("array");
                expect(entities.length).to.be.gt(0);
                const entityNames = entities.map((entity: any) => entity.name);
                expect(entityNames).to.include("User");
                expect(entityNames).to.include("SomeModal");
                expect(entityNames).to.include("User2");
                expect(entityNames).to.include("SomeModal2");
            `
        });
    });

    it("should add entity with default export from file", async () => {
        await testDataSourceFile({
            dataSourceCode: `
                import { entities } from "./entities.js"

                export const AppDataSource = new DataSource({
                    type: "sqlite",
                    database: "database.db",
                    entities: entities
                });
            `,
            commandParams: {
                dataSource: "data-source.ts",
                entities: ["entities/User.ts"]
            },
            files: [{
                path: "entities.ts",
                content: `
                    import { SomeModal } from "./entities/SomeModal.js";

                    export const entities = <any[]>[
                        SomeModal
                    ];
                `
            }, {
                path: "entities/SomeModal.ts",
                content: `
                    export class SomeModal {}
                `
            }, {
                path: "entities/User.ts",
                content: `
                    export default class User {}
                `
            }],
            testCode: `
                expect(dataSourceResult.AppDataSource.options).to.haveOwnProperty("entities");
                
                const entities: any = dataSourceResult.AppDataSource.options.entities;
                expect(entities).to.be.an("array");
                expect(entities.length).to.be.gt(0);
                const entityNames = entities.map((entity: any) => entity.name);
                expect(entityNames).to.include("User");
                expect(entityNames).to.include("SomeModal");
            `
        });
    });

    it("should add entity with no name from file", async () => {
        await testDataSourceFile({
            dataSourceCode: `
                import { entities } from "./entities.js"

                export const AppDataSource = new DataSource({
                    type: "sqlite",
                    database: "database.db",
                    entities: entities
                });
            `,
            commandParams: {
                dataSource: "data-source.ts",
                entities: ["entities/User.ts"]
            },
            files: [{
                path: "entities.ts",
                content: `
                    import { SomeModal } from "./entities/SomeModal.js";

                    export const entities = [
                        SomeModal
                    ] as any[];
                `
            }, {
                path: "entities/SomeModal.ts",
                content: `
                    export class SomeModal {}
                `
            }, {
                path: "entities/User.ts",
                content: `
                    export default class {
                        static className = "User";
                    }
                `
            }],
            testCode: `
                expect(dataSourceResult.AppDataSource.options).to.haveOwnProperty("entities");
                
                const entities: any = dataSourceResult.AppDataSource.options.entities;
                expect(entities).to.be.an("array");
                expect(entities.length).to.be.gt(0);
                const entityNames = entities.map((entity: any) => entity?.className ?? entity.name);
                expect(entityNames).to.include("User");
                expect(entityNames).to.include("SomeModal");
            `
        });
    });

    it("should add migration from folder", async () => {
        await testDataSourceFile({
            dataSourceCode: `
                import { migrations } from "./migrations.js"

                export const AppDataSource = new DataSource({
                    type: "sqlite",
                    database: "database.db",
                    migrations: migrations
                });
            `,
            commandParams: {
                dataSource: "data-source.ts",
                migrations: ["migrations"]
            },
            files: [{
                path: "migrations.ts",
                content: `
                    import { SomeMigration } from "./migrations/SomeMigration.js";

                    export const migrations = [
                        SomeMigration
                    ];
                `
            }, {
                path: "migrations/SomeMigration.ts",
                content: `
                    export class SomeMigration {}
                `
            }, {
                path: "migrations/Migration2.ts",
                content: `
                    export class Migration2 {}
                `
            }],
            testCode: `
                expect(dataSourceResult.AppDataSource.options).to.haveOwnProperty("migrations");
                
                const migrations: any = dataSourceResult.AppDataSource.options.migrations;
                expect(migrations).to.be.an("array");
                expect(migrations.length).to.be.gt(0);
                const migrationNames = migrations.map((migration: any) => migration.name);
                expect(migrationNames).to.include("Migration2");
                expect(migrationNames).to.include("SomeMigration");
            `
        });
    });

    it("should add subscriber from folder", async () => {
        await testDataSourceFile({
            dataSourceCode: `
                import { subscribers } from "./subscribers.js"

                export const AppDataSource = new DataSource({
                    type: "sqlite",
                    database: "database.db",
                    subscribers: subscribers
                });
            `,
            commandParams: {
                dataSource: "data-source.ts",
                subscribers: ["subscribers"]
            },
            files: [{
                path: "subscribers.ts",
                content: `
                    import { SomeSubscriber } from "./subscribers/SomeSubscriber.js";

                    export const subscribers = [
                        SomeSubscriber
                    ];
                `
            }, {
                path: "subscribers/SomeSubscriber.ts",
                content: `
                    export class SomeSubscriber {}
                `
            }, {
                path: "subscribers/Subscriber2.ts",
                content: `
                    export class Subscriber2 {}
                `
            }],
            testCode: `
                expect(dataSourceResult.AppDataSource.options).to.haveOwnProperty("subscribers");
                
                const subscribers: any = dataSourceResult.AppDataSource.options.subscribers;
                expect(subscribers).to.be.an("array");
                expect(subscribers.length).to.be.gt(0);
                const subscriberNames = subscribers.map((subscriber: any) => subscriber.name);
                expect(subscriberNames).to.include("Subscriber2");
                expect(subscriberNames).to.include("SomeSubscriber");
            `
        });
    });
});
