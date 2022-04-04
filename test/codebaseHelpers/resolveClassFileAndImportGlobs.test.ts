import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {expect} from "chai";
import {resolveClassFileAndImportGlobs} from "../../src/codebaseHelpers/resolveClassFileAndImportGlobs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("resolveClassFileAndImportGlobs", function () {
    const testDir = path.join(__dirname, "testResolveClassFileAndImportGlobs");

    function rmdirSync(dir: string) {
        if (fs.rmSync != null)
            fs.rmSync(dir, {recursive: true});
        else
            fs.rmdirSync(dir, {recursive: true});
    }

    function createDir(dirPath: string) {
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, {recursive: true});
    }

    function writeFile(filePath: string, content: string) {
        createDir(path.dirname(filePath));
        fs.writeFileSync(filePath, content, "utf8");
    }

    beforeEach(() => {
        if (fs.existsSync(testDir)) rmdirSync(testDir);
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) rmdirSync(testDir);
    });

    it("should find variable export in 'entities/*.ts'", async () => {
        const filePath = path.join(testDir, "entities", "User.ts");
        writeFile(filePath, `
            export const User2 = class User {
            
            }
        `);

        const res = await resolveClassFileAndImportGlobs(testDir, ["entities/*.ts"]);
        expect(res).to.eql([{
            importName: "User2",
            exportName: "User2",
            importDefault: false,
            filePath: filePath
        }]);
    });

    it("should find variable export in 'entities'", async () => {
        const filePath = path.join(testDir, "entities", "User.ts");
        writeFile(filePath, `
            export const User2 = class User {
            
            }
        `);

        const res = await resolveClassFileAndImportGlobs(testDir, ["entities"]);
        expect(res).to.eql([{
            importName: "User2",
            exportName: "User2",
            importDefault: false,
            filePath: filePath
        }]);
    });

    it("should find class export", async () => {
        const filePath = path.join(testDir, "entities", "User.ts");
        writeFile(filePath, `
            export class User {
            
            }
        `);

        const res = await resolveClassFileAndImportGlobs(testDir, ["entities"]);
        expect(res).to.eql([{
            importName: "User",
            exportName: "User",
            importDefault: false,
            filePath: filePath
        }]);
    });

    it("should find default class export", async () => {
        const filePath = path.join(testDir, "entities", "User.ts");
        writeFile(filePath, `
            export default class User {
            
            }
        `);

        const res = await resolveClassFileAndImportGlobs(testDir, ["entities"]);
        expect(res).to.eql([{
            importName: "User",
            exportName: "User",
            importDefault: true,
            filePath: filePath
        }]);
    });
});
