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
    if (importPath.startsWith('@/')) {
        return path.resolve('./src', importPath.replace('@/', ''));
    }
    if (importPath.startsWith('@shared/')) {
        return path.resolve('./packages/shared/src', importPath.replace('@shared/', ''));
    }
    return importPath;
}

function findFileWithExtension(basePath: string): string | null {
    const extensions = ['.tsx', '.ts', '.d.ts', '/index.tsx', '/index.ts'];
    if (fs.existsSync(basePath) && !fs.statSync(basePath).isDirectory()) return basePath;
    
    for (const ext of extensions) {
        const fullPath = basePath + ext;
        if (fs.existsSync(fullPath)) return fullPath;
    }
    return null;
}

// Enhanced to follow barrel exports (export * from './...')
// Enhanced to separate full-file components from smaller utilities/types
function extractBlock(filePath: string, targetName: string, isDefault: boolean = false): { code: string | null; isFullFileComponent: boolean } {
    if (!fs.existsSync(filePath)) return { code: null, isFullFileComponent: false };
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);
    let foundCode: string | null = null;
    let isFullFileComponent = false;

    // Helper to check if a block looks like a heavy frontend component (returns JSX/TSX elements)
    function isJSXComponent(text: string): boolean {
        return text.includes('return (') && (text.includes('<div') || text.includes('<form') || text.includes('<section') || text.includes('</'));
    }

    function traverse(node: ts.Node) {
        if (foundCode) return;

        if (isDefault) {
            // Case A: Indirect export default assignment (e.g., export default CreateProductFormClient;)
            if (ts.isExportAssignment(node)) {
                const expression = node.expression;
                if (ts.isIdentifier(expression)) {
                    const localName = expression.text;
                    const result = extractBlock(filePath, localName, false);
                    
                    if (result.code) {
                        if (isJSXComponent(result.code)) {
                            isFullFileComponent = true;
                            foundCode = node.getText(sourceFile); // Just return the export pointer line
                        } else {
                            foundCode = `${result.code}\n\n${node.getText(sourceFile)}`;
                        }
                        return;
                    }
                }
                foundCode = node.getText(sourceFile);
                return;
            }
            // Case B: Direct inline default export (e.g., export default function MyComponent() {})
            if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.modifiers) {
                const hasExport = node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
                const hasDefault = node.modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
                if (hasExport && hasDefault) {
                    const text = node.getText(sourceFile);
                    if (isJSXComponent(text)) {
                        isFullFileComponent = true;
                    }
                    foundCode = text;
                    return;
                }
            }
        } else {
            // Named checks
            if (ts.isFunctionDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isClassDeclaration(node)) {
                if (node.name && node.name.text === targetName) {
                    const text = node.getText(sourceFile);
                    if (isJSXComponent(text)) {
                        isFullFileComponent = true;
                    }
                    foundCode = text;
                    return;
                }
            }
            if (ts.isVariableDeclaration(node)) {
                if (node.name && ts.isIdentifier(node.name) && node.name.text === targetName) {
                    const text = node.parent.parent.getText(sourceFile);
                    if (isJSXComponent(text)) {
                        isFullFileComponent = true;
                    }
                    foundCode = text;
                    return;
                }
            }
        }
        ts.forEachChild(node, traverse);
    }

    traverse(sourceFile);
    if (foundCode) return { code: foundCode, isFullFileComponent };

    // Barrel File Fallback (only applies to named lookups)
    if (!isDefault) {
        for (const statement of sourceFile.statements) {
            if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
                const exportPath = statement.moduleSpecifier.text;
                const rawPath = path.resolve(path.dirname(filePath), exportPath);
                const deeperFile = findFileWithExtension(rawPath);

                if (deeperFile) {
                    const result = extractBlock(deeperFile, targetName, isDefault);
                    if (result.code) return result;
                }
            }
        }
    }

    return { code: null, isFullFileComponent: false };
}

function processFile(targetFilePath: string) {
    const sourceCode = fs.readFileSync(targetFilePath, 'utf8');
    const sourceFile = ts.createSourceFile(targetFilePath, sourceCode, ts.ScriptTarget.Latest, true);

    console.log(`\n🔍 Scanning target file dependencies: ${path.basename(targetFilePath)}`);
    console.log(`======================================================================`);

    sourceFile.statements.forEach(node => {
        if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const importPath = node.moduleSpecifier.text;

            if (isLocalImport(importPath)) {
                const rawResolvedPath = resolveFilePath(targetFilePath, importPath);
                const actualFilePath = findFileWithExtension(rawResolvedPath);

                if (!actualFilePath) return;

                if (node.importClause) {
                    // 1. Handle Default Imports
                    if (node.importClause.name) {
                        const importedName = node.importClause.name.text;
                        const result = extractBlock(actualFilePath, importedName, true);
                        
                        if (result.isFullFileComponent) {
                            console.log(`◽ [${importedName}] is a full-file component, skipping body extraction.`);
                        } else if (result.code) {
                            console.log(`📦 EXTRACTED DEFAULT [${importedName}] from ${importPath}:\n${result.code}\n`);
                        } else {
                            console.log(`❌ Could not find default export for [${importedName}] in ${importPath}\n`);
                        }
                    }

                    // 2. Handle Named Imports
                    if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
                        node.importClause.namedBindings.elements.forEach(element => {
                            const importedName = element.name.text;
                            const result = extractBlock(actualFilePath, importedName, false);
                            
                            if (result.isFullFileComponent) {
                                console.log(`◽ [${importedName}] is a full-file component declaration, skipping body extraction.`);
                            } else if (result.code) {
                                console.log(`📦 EXTRACTED NAMED [${importedName}] from ${importPath}:\n${result.code}\n`);
                            } else {
                                console.log(`❌ Could not find declaration for [${importedName}] in ${importPath}\n`);
                            }
                        });
                    }
                }
            }
        }
    });
}

// --- DYNAMIC TARGET SETUP ---
// process.argv[2] grabs the first custom argument given in the terminal command
const targetFile = process.argv[2];

if (!targetFile) {
    console.error("❌ Error: Please provide a file path.");
    console.log("💡 Usage: npx tsx ./scripts/extract.ts <path-to-file>");
    process.exit(1);
}

if (fs.existsSync(targetFile)) {
    processFile(targetFile);
} else {
    console.error(`❌ Error: Cannot find target file at "${targetFile}". Please verify the path.`);
    process.exit(1);
}