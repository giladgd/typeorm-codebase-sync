import path from "path";
import fs from "fs";

export async function determineModuleSystemForFile(filePath: string): Promise<"esm" | "commonjs"> {
    const extension = filePath.substring(filePath.lastIndexOf(".") + ".".length);

    if (extension === "mjs" || extension === "mts")
        return "esm";
    else if (extension === "cjs" || extension === "cts")
        return "commonjs";
    else if (extension === "js" || extension === "ts") {
        const packageJson = await getNearestPackageJson(filePath);

        if (packageJson != null) {
            const isModule = (packageJson as any)?.type === "module";

            if (isModule)
                return "esm";
            else
                return "commonjs";
        } else
            return "commonjs";
    }

    return "commonjs";
}

function getNearestPackageJson(filePath: string): Promise<object | null> {
    return new Promise((accept) => {
        let currentPath = filePath;

        function searchPackageJson() {
            const nextPath = path.dirname(currentPath);

            if (currentPath === nextPath) // the top of the file tree is reached
                accept(null);
            else {
                currentPath = nextPath;
                const potentialPackageJson = path.join(currentPath, "package.json");

                fs.stat(potentialPackageJson, (err, stats) => {
                    if (err != null)
                        searchPackageJson();
                    else if (stats.isFile()) {
                        fs.readFile(potentialPackageJson, "utf8", (err, data) => {
                            if (err != null)
                                accept(null);
                            else {
                                try {
                                    accept(JSON.parse(data));
                                } catch (err) {
                                    accept(null);
                                }
                            }
                        });
                    } else
                        searchPackageJson();
                });
            }
        }

        searchPackageJson();
    });
}
