import path from "path";
import glob from "glob";
import ts from "typescript";
import {Codebase} from "../utils/Codebase.js";
import {filePathToImportName} from "../utils/filePathToImportName.js";
import {updateWithTypeExpression} from "../utils/updateWithTypeExpression.js";

export async function resolveClassFileAndImportGlobs(cwd: string, fileGlobs: string[]) {
    const res: ResolvedFileImport[] = [];

    const processPath = async (p: string) => {
        const ext = path.extname(p);
        const absolutePath = path.resolve(cwd, p);

        if (ext !== ".ts" && ext !== ".cts" && ext !== ".mts")
            return;

        const codebase = new Codebase({entryFilePath: absolutePath});
        await codebase.initialize();

        const sourceFile = codebase.getSourceFile(absolutePath) as ts.SourceFile;

        findAndAddImport(sourceFile);
    };

    const findAndAddImport = (sourceFile: ts.SourceFile) => {
        for (const statement of sourceFile.statements) {
            if (ts.isVariableStatement(statement)) {
                if (!statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
                    continue;

                for (const declaration of statement.declarationList.declarations) {
                    if (!ts.isVariableDeclaration(declaration))
                        continue;

                    if (declaration.initializer == null)
                        continue;

                    let valueIsClass = false;

                    updateWithTypeExpression(declaration.initializer,
                        (valueExpression) => {
                            if (ts.isClassExpression(valueExpression))
                                valueIsClass = true;

                            return valueExpression;
                        }
                    );

                    if (!valueIsClass)
                        continue;

                    const name = declaration.name.getText();
                    res.push({
                        importName: name,
                        exportName: name,
                        importDefault: statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword),
                        filePath: path.resolve(sourceFile.fileName)
                    });
                    return;
                }
            } else if (ts.isClassDeclaration(statement)) {
                if (!statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
                    continue;

                const name = statement.name?.getText() ?? filePathToImportName(path.resolve(sourceFile.fileName));

                res.push({
                    importName: name,
                    exportName: name,
                    importDefault: statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword),
                    filePath: path.resolve(sourceFile.fileName)
                });
                return;
            }
        }
    };

    for (const filesGlob of fileGlobs) {
        const matches = glob.sync(filesGlob, {
            cwd,
            dot: true,
            mark: true
        });

        for (const match of matches) {
            if (match.endsWith("/")) {
                const subMatches = glob.sync(match + "*{.ts,.cts,.mts}", {
                    cwd,
                    dot: true,
                    mark: true,
                    nodir: true
                });

                for (const subMatch of subMatches)
                    await processPath(subMatch);
            } else
                await processPath(match);
        }
    }

    return res;
}

export type ResolvedFileImport = {
    filePath: string,
    importName: string,
    exportName: string,
    importDefault: boolean,
};
