import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

function resolveModulePath(importPath: string, currentFile: string): string | null {
    if (importPath.startsWith(".")) {
        const absolute = path.resolve(path.dirname(currentFile), importPath);
        const extensions = [".ts", ".tsx", ".d.ts"];
        for (const ext of extensions) {
            if (fs.existsSync(absolute + ext)) return absolute + ext;
            if (fs.existsSync(path.join(absolute, `index${ext}`))) return path.join(absolute, `index${ext}`);
        }
    }

    const baseUrl = path.resolve(process.cwd());
    const aliases: Record<string, string> = {
        "@lib": "src/lib",
        "@shared": "src/shared",
        "@app": "src/app",
        "@modules": "src/modules"
    };

    for (const [alias, target] of Object.entries(aliases)) {
        if (importPath.startsWith(alias)) {
            const remaining = importPath.substring(alias.length);
            const targetPath = path.join(baseUrl, target, remaining);
            const extensions = [".ts", ".tsx", ".d.ts"];
            for (const ext of extensions) {
                if (fs.existsSync(targetPath + ext)) return targetPath + ext;
                if (fs.existsSync(path.join(targetPath, `index${ext}`))) return path.join(targetPath, `index${ext}`);
            }
        }
    }
    return null;
}

function extractFromFile(filePath: string, targetNames: string[], visitedFiles = new Set<string>()) {
    if (visitedFiles.has(filePath) || !fs.existsSync(filePath)) return;
    visitedFiles.add(filePath);

    const sourceText = fs.readFileSync(filePath, "utf-8");
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

    const processNode = (node: ts.Node) => {
        // 1. Extract matching Interfaces or Type Aliases
        if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
            const name = node.name.text;
            if (targetNames.includes(name)) {
                console.log(`\n📦 EXTRACTED TYPE [${name}] from ${path.basename(filePath)}:`);
                console.log(node.getText(sourceFile));
            }
        }

        // 2. Extract specific Function Declarations (even if they return UI/JSX elements)
        if (ts.isFunctionDeclaration(node) && node.name) {
            const name = node.name.text;
            if (targetNames.includes(name)) {
                console.log(`\n📦 EXTRACTED FUNCTION BLOCK [${name}] from ${path.basename(filePath)}:`);
                console.log(node.getText(sourceFile));
            }
        }

        // 3. Extract specific Exported Variables/Arrow Functions (e.g., const MyComponent = () => ...)
        if (ts.isVariableStatement(node)) {
            node.declarationList.declarations.forEach((declaration) => {
                const name = declaration.name.getText(sourceFile);
                if (targetNames.includes(name)) {
                    console.log(`\n📦 EXTRACTED VARIABLE BLOCK [${name}] from ${path.basename(filePath)}:`);
                    console.log(node.getText(sourceFile));
                }
            });
        }

        // 4. Follow imports recursively without skipping modules
        if (ts.isImportDeclaration(node)) {
            const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
            const namedBindings = node.importClause?.namedBindings;

            if (namedBindings && ts.isNamedImports(namedBindings)) {
                const importedElements = namedBindings.elements.map(e => e.name.text);
                const matches = importedElements.filter(name => targetNames.includes(name));

                if (matches.length > 0) {
                    const resolvedPath = resolveModulePath(moduleSpecifier, filePath);
                    if (resolvedPath) {
                        extractFromFile(resolvedPath, matches, visitedFiles);
                    }
                }
            }
        }

        ts.forEachChild(node, processNode);
    };

    ts.forEachChild(sourceFile, processNode);
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("Usage: npx tsx scripts/extract.ts <target-file-path>");
    process.exit(1);
}

const targetFile = path.resolve(args[0]);
console.log(`🔍 Scanning target file dependencies: ${path.basename(targetFile)}`);
console.log("======================================================================");

if (fs.existsSync(targetFile)) {
    const sourceText = fs.readFileSync(targetFile, "utf-8");
    const sourceFile = ts.createSourceFile(targetFile, sourceText, ts.ScriptTarget.Latest, true);
    const targetsToFind: string[] = [];

    const findInitialImports = (node: ts.Node) => {
        if (ts.isImportDeclaration(node) && node.importClause?.namedBindings) {
            const namedBindings = node.importClause.namedBindings;
            if (ts.isNamedImports(namedBindings)) {
                namedBindings.elements.forEach(e => targetsToFind.push(e.name.text));
            }
        }
        ts.forEachChild(node, findInitialImports);
    };

    ts.forEachChild(sourceFile, findInitialImports);

    // Parse dependencies directly without filtering out UI components
    extractFromFile(targetFile, targetsToFind);
} else {
    console.error(`Target file error: ${targetFile} could not be opened.`);
}