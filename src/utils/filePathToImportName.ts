import path from "path";

export function filePathToImportName(filePath: string) {
    return path.basename(filePath, path.extname(filePath))
        .replace(/[^A-Z|a-z|0-9]/g, "")
        .replace(/^([0-9]+)(.*)$/, "$2");
}
