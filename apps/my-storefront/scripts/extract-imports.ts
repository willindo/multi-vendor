// cat > ~/medusa-dev/scripts/extract-imports.ts << 'EOF'
// #!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const targetFile = process.argv[2] || './src/app/vendor/dashboard/products/edit/[id]/EditProductFormClient.tsx';
const basePath = '/home/badsha/medusa-dev/apps';
const sharedDir = path.join(basePath, 'packages/shared/src');
const storefrontDir = path.join(basePath, 'my-storefront/src');

console.log(`=== Extracting imports from: ${targetFile} ===`);
console.log('================================================\n');

function extractFullBlock(filePath: string, lineNum: number): string {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let block = '';
    let braceCount = 0;
    let started = false;
    
    for (let i = lineNum - 1; i < lines.length; i++) {
        const line = lines[i];
        
        if (!started) {
            // Check if this line starts a declaration
            if (/^\s*(export\s+)?(function|const|let|var|interface|type)\s+/.test(line)) {
                started = true;
                block = line;
                braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
                
                if (braceCount === 0 && !line.includes('{')) {
                    // Single line declaration without braces (like interface)
                    return block;
                }
                continue;
            }
        } else {
            block += '\n' + line;
            braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
            
            if (braceCount === 0 && block.includes('{')) {
                return block;
            }
        }
    }
    
    return block || 'No block found';
}

function findFile(filePath: string): string | null {
    const extensions = ['.tsx', '.ts', '.jsx', '.js'];
    for (const ext of extensions) {
        if (fs.existsSync(filePath + ext)) return filePath + ext;
        if (fs.existsSync(path.join(filePath, 'index' + ext))) return path.join(filePath, 'index' + ext);
    }
    return null;
}

const content = fs.readFileSync(targetFile, 'utf8');
const importRegex = /from\s+['"]([^'"]+)['"]/g;
const lines = content.split('\n');

lines.forEach((line, idx) => {
    const match = line.match(/from\s+['"]([^'"]+)['"]/);
    if (!match) return;
    
    const importPath = match[1];
    const lineNum = idx + 1;
    
    // Skip libraries
    if (/^(react|next|@medusajs)/.test(importPath)) {
        console.log(`⏭️  Line ${lineNum}: Skipping library - ${importPath}`);
        return;
    }
    
    console.log(`\n📦 Line ${lineNum}: ${importPath}`);
    
    // Handle @/ components
    if (importPath.startsWith('@/')) {
        const relPath = importPath.replace('@/', '');
        const filePath = path.join(storefrontDir, relPath);
        const actualFile = findFile(filePath);
        
        if (!actualFile) {
            console.log('   ⚠️  File not found');
            return;
        }
        
        console.log(`   📁 File: ${actualFile}`);
        
        // Default import
        const defaultMatch = line.match(/import\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+from/);
        if (defaultMatch && defaultMatch[1] !== '{' && defaultMatch[1] !== 'type') {
            const defaultName = defaultMatch[1];
            console.log(`   🎯 Default import: ${defaultName}`);
            const declMatch = fs.readFileSync(actualFile, 'utf8')
                .match(new RegExp(`^\\s*(export\\s+default\\s+${defaultName}|const\\s+${defaultName}\\s*=)`, 'm'));
            if (declMatch) {
                // Find line number
                const lines = fs.readFileSync(actualFile, 'utf8').split('\n');
                const lineNum = lines.findIndex(l => new RegExp(`^\\s*(export\\s+default\\s+${defaultName}|const\\s+${defaultName}\\s*=)`).test(l)) + 1;
                const relFile = actualFile.replace(storefrontDir + '/', '');
                console.log(`      📍 ${relFile}:${lineNum}`);
                console.log(`      ${extractFullBlock(actualFile, lineNum)}`);
            }
        }
        
        // Named imports
        const namedMatch = line.match(/{\s*([^}]+)\s*}/);
        if (namedMatch) {
            const items = namedMatch[1].split(',').map(s => s.trim()).filter(s => s && !['import', 'type', 'from'].includes(s));
            if (items.length) {
                console.log('   📝 Named imports:');
                items.forEach(item => {
                    console.log(`\n      ► ${item}`);
                    const regex = new RegExp(`^\\s*(export\\s+)?(function|const|let|var|interface|type)\\s+${item}\\b`, 'm');
                    const match = fs.readFileSync(actualFile, 'utf8').match(regex);
                    if (match) {
                        const lines = fs.readFileSync(actualFile, 'utf8').split('\n');
                        const lineNum = lines.findIndex(l => regex.test(l)) + 1;
                        const relFile = actualFile.replace(storefrontDir + '/', '');
                        console.log(`         📍 ${relFile}:${lineNum}`);
                        console.log(`         ${extractFullBlock(actualFile, lineNum)}`);
                    }
                });
            }
        }
    }
    
    // Handle @shared
    if (importPath.startsWith('@shared')) {
        const indexFile = path.join(sharedDir, 'index.ts');
        if (!fs.existsSync(indexFile)) {
            console.log('   ⚠️  Index not found');
            return;
        }
        
        console.log(`   📁 Index: ${indexFile}`);
        
        const namedMatch = line.match(/{\s*([^}]+)\s*}/);
        if (namedMatch) {
            const items = namedMatch[1].split(',').map(s => s.trim()).filter(s => s && !['import', 'type', 'from'].includes(s));
            if (items.length) {
                console.log('   🔍 Looking for:');
                items.forEach(item => {
                    console.log(`\n      ► ${item}`);
                    if (line.includes('import type')) {
                        console.log('         ℹ️  Type import');
                    }
                    
                    // Find in index.ts
                    const indexContent = fs.readFileSync(indexFile, 'utf8');
                    const exportMatch = indexContent.match(new RegExp(`export.*${item}`, 'm'));
                    if (exportMatch) {
                        const lines = indexContent.split('\n');
                        const lineNum = lines.findIndex(l => l.includes(`export`) && l.includes(item)) + 1;
                        console.log(`         📍 Index: ${lineNum}:${exportMatch[0]}`);
                        
                        // Extract source file
                        const srcMatch = exportMatch[0].match(/from\s+['"]([^'"]+)['"]/);
                        if (srcMatch) {
                            const srcPath = path.join(sharedDir, srcMatch[1].replace('./', ''));
                            const actualFile = findFile(srcPath);
                            if (actualFile) {
                                console.log(`         📁 Source: ${actualFile.replace(sharedDir + '/', '')}`);
                                const regex = new RegExp(`^\\s*(export\\s+)?(function|const|let|var|interface|type)\\s+${item}\\b`, 'm');
                                const match = fs.readFileSync(actualFile, 'utf8').match(regex);
                                if (match) {
                                    const lines = fs.readFileSync(actualFile, 'utf8').split('\n');
                                    const lineNum = lines.findIndex(l => regex.test(l)) + 1;
                                    console.log(`            📍 ${lineNum}`);
                                    console.log(`            ${extractFullBlock(actualFile, lineNum)}`);
                                }
                            }
                        }
                    }
                });
            }
        }
    }
});

console.log('\n================================================');
console.log('✅ Complete!');
// EOF
