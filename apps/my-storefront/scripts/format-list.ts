// ./scripts/format-list.ts
import * as fs from 'fs';

interface TreeNode {
    type: 'directory' | 'file';
    name: string;
    contents?: TreeNode[];
}

// Helper to convert a raw list of paths into a structured TreeNode tree
function buildTreeFromPaths(paths: string[]): TreeNode {
    const root: TreeNode = { type: 'directory', name: '.', contents: [] };

    for (const rawPath of paths) {
        const cleanPath = rawPath.replace(/^\.\//, '').trim();
        if (!cleanPath) continue;

        const parts = cleanPath.split('/');
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;

            if (isLast) {
                if (!current.contents) current.contents = [];
                current.contents.push({ type: 'file', name: part });
            } else {
                if (!current.contents) current.contents = [];
                let dir = current.contents.find(c => c.type === 'directory' && c.name === part);
                if (!dir) {
                    dir = { type: 'directory', name: part, contents: [] };
                    current.contents.push(dir);
                }
                current = dir;
            }
        }
    }
    return root;
}

function childFiles(node: TreeNode): TreeNode[] {
    return node.contents?.filter(c => c.type === 'file') || [];
}

function childDirs(node: TreeNode): TreeNode[] {
    return node.contents?.filter(c => c.type === 'directory') || [];
}

function format(node: TreeNode, indent = ""): string {
    if (node.type === 'file') return indent + node.name;

    const lines: string[] = [];
    let currentName = node.name;
    let currentDirs = childDirs(node);
    let currentFiles = childFiles(node);

    // Compress deep single-child folder chains
    while (currentDirs.length === 1 && currentFiles.length === 0) {
        const nextDir = currentDirs[0];
        currentName = `${currentName}/${nextDir.name}`;
        currentDirs = childDirs(nextDir);
        currentFiles = childFiles(nextDir);
    }

    // Don't append trailing slash if it's the root node
    const displayName = currentName === '.' ? '.' : `${currentName}/`;

    if (currentFiles.length) {
        const fileList = currentFiles.map(f => f.name).join(", ");
        lines.push(indent + `${displayName} ${fileList}`);
    } else {
        lines.push(indent + displayName);
    }

    for (const dir of currentDirs) {
        lines.push(format(dir, indent + "    "));
    }

    return lines.join("\n");
}

// Immediate Execution Block
(function run() {
    try {
        if (!fs.existsSync('./report-list.txt')) {
            console.error("Error: report-list.txt not found.");
            return;
        }

        const rawContent = fs.readFileSync('./report-list.txt', 'utf8');
        const paths = rawContent.split('\n');
        const treeData = buildTreeFromPaths(paths);

        console.log("\n" + format(treeData));
    } catch (error) {
        console.error("Error processing custom list report:", error);
    }
})();