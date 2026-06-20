import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

function isLocalImport(importPath: string): boolean {
    return (
        importPath.startsWith('.') || 
        importPath.startsWith('@/') || 
        importPath.startsWith('~/') ||
        importPath.startsWith('@shared/')
    );
}

function resolveFilePath(currentFile: string, importPath: string): string {
    if (importPath.startsWith('.')) {
        return path.resolve(path.dirname(currentFile), importPath);
    }
    // Handles src/ absolute paths if used in Medusa V2
    if (importPath.startsWith('@/') || importPath.startsWith('~/')) {
        return path.resolve('./src', importPath.slice(2));
    }
    // Shared package alias: "@shared/..." -> "../packages/shared/src/..."
    if (importPath.startsWith('@shared/')) {
        return path.resolve('./packages/shared/src', importPath.replace('@shared/', ''));
    }
    return importPath;
}

function findFileWithExtension(basePath: string): string | null {
    const extensions = ['.tsx', '.ts', '.d.ts', '/index.tsx', '/index.ts', '.js'];
    if (fs.existsSync(basePath) && !fs.statSync(basePath).isDirectory()) return basePath;
    
    for (const ext of extensions) {
        const fullPath = basePath + ext;
        if (fs.existsSync(fullPath)) return fullPath;
    }
    return null;
}

function extractBlock(filePath: string, targetName: string, isDefault: boolean = false): string | null {
    if (!fs.existsSync(filePath)) return null;
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);
    let foundCode: string | null = null;

    function traverse(node: ts.Node) {
        if (foundCode) return;

        if (isDefault) {
            // Case A: Explicit inline export "export default createWorkflow(...)"
            if (ts.isExportAssignment(node)) {
                const expression = node.expression;
                // If it's just exporting an identifier pointing to a variable above (e.g., export default myWorkflow)
                if (ts.isIdentifier(expression)) {
                    const localName = expression.text;
                    // Recursively search this exact file for the true variable declaration
                    const localBlock = extractBlock(filePath, localName, false);
                    if (localBlock) {
                        foundCode = `${localBlock}\n\n${node.getText(sourceFile)}`;
                        return;
                    }
                }
                foundCode = node.getText(sourceFile);
                return;
            }
            // Case B: Modifiers "export default function x() {}"
            if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.modifiers) {
                const hasExport = node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
                const hasDefault = node.modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
                if (hasExport && hasDefault) {
                    foundCode = node.getText(sourceFile);
                    return;
                }
            }
        } else {
            // Standard Named checks (Functions, Types, Interfaces, Classes)
            if (ts.isFunctionDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isClassDeclaration(node)) {
                if (node.name && node.name.text === targetName) {
                    foundCode = node.getText(sourceFile);
                    return;
                }
            }
            // Constants / Variables (Matches: const targetName = ...)
            if (ts.isVariableDeclaration(node)) {
                if (node.name && ts.isIdentifier(node.name) && node.name.text === targetName) {
                    foundCode = node.parent.parent.getText(sourceFile);
                    return;
                }
            }
        }
        ts.forEachChild(node, traverse);
    }

    traverse(sourceFile);
    if (foundCode) return foundCode;

    // Barrel fallback (only applies to named lookups)
    if (!isDefault) {
        for (const statement of sourceFile.statements) {
            if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
                const exportPath = statement.moduleSpecifier.text;
                const rawPath = path.resolve(path.dirname(filePath), exportPath);
                const deeperFile = findFileWithExtension(rawPath);

                if (deeperFile) {
                    const deepBlock = extractBlock(deeperFile, targetName, isDefault);
                    if (deepBlock) return deepBlock;
                }
            }
        }
    }

    return null;
}

function processFile(targetFilePath: string) {
    const sourceCode = fs.readFileSync(targetFilePath, 'utf8');
    const sourceFile = ts.createSourceFile(targetFilePath, sourceCode, ts.ScriptTarget.Latest, true);

    console.log(`\n🔍 [Medusa Backend] Scanning file: ${path.basename(targetFilePath)}\n`);

    sourceFile.statements.forEach(node => {
        if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const importPath = node.moduleSpecifier.text;

            if (isLocalImport(importPath)) {
                const rawResolvedPath = resolveFilePath(targetFilePath, importPath);
                const actualFilePath = findFileWithExtension(rawResolvedPath);

                if (!actualFilePath) return;

                if (node.importClause) {
                    // 1. HANDLE DEFAULT IMPORTS: import deleteVendorProductWorkflow from "..."
                    if (node.importClause.name) {
                        const importedName = node.importClause.name.text;
                        const block = extractBlock(actualFilePath, importedName, true);
                        
                        if (block) {
                            console.log(`=========================================`);
                            console.log(`📦 EXTRACTED DEFAULT [${importedName}]`);
                            console.log(`=========================================`);
                            console.log(block, '\n');
                        } else {
                            console.log(`❌ Could not find default export for [${importedName}] in ${importPath}`);
                        }
                    }

                    // 2. HANDLE NAMED IMPORTS: import { validateVendorProductOwnership } from "..."
                    if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
                        node.importClause.namedBindings.elements.forEach(element => {
                            const importedName = element.name.text;
                            const block = extractBlock(actualFilePath, importedName, false);
                            
                            if (block) {
                                console.log(`=========================================`);
                                console.log(`📦 EXTRACTED NAMED [${importedName}]`);
                                console.log(`=========================================`);
                                console.log(block, '\n');
                            } else {
                                console.log(`❌ Could not find declaration for [${importedName}] in ${importPath}`);
                            }
                        });
                    }
                }
            }
        }
    });
}

const targetFile = process.argv[2];

if (!targetFile) {
    console.error("❌ Error: Please provide a file path.");
    console.log("💡 Usage: npx tsx ./scripts/extract.ts <path-to-file>");
    process.exit(1);
}

if (fs.existsSync(targetFile)) {
    processFile(targetFile);
} else {
    console.error(`❌ Error: Cannot find target file at "${targetFile}".`);
    process.exit(1);
}