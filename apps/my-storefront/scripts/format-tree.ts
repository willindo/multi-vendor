// ./scripts/format-tree.ts
import * as fs from 'fs';

interface TreeNode {
    type: 'directory' | 'file';
    name: string;
    contents?: TreeNode[];
}

function isFile(node: TreeNode): boolean {
    return node.type === 'file';
}

function childFiles(node: TreeNode): TreeNode[] {
    return node.contents?.filter(c => c.type === 'file') || [];
}

function childDirs(node: TreeNode): TreeNode[] {
    return node.contents?.filter(c => c.type === 'directory') || [];
}

function format(node: TreeNode, indent = ""): string {
    if (isFile(node)) {
        return indent + node.name;
    }

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

    // Format files inline right after the directory slash if they exist
    if (currentFiles.length) {
        const fileList = currentFiles.map(f => f.name).join(", ");
        lines.push(indent + `${currentName}/ ${fileList}`);
    } else {
        lines.push(indent + `${currentName}/`);
    }

    // Process subdirectories with the updated indentation
    for (const dir of currentDirs) {
        lines.push(format(dir, indent + "    "));
    }

    return lines.join("\n");
}

// Immediate execution block for standard Node environments
(function run() {
    try {
        if (!fs.existsSync('./tree.json')) {
            console.error("Error: tree.json not found. Run 'npm run format-tree' to generate it.");
            return;
        }

        const rawData = fs.readFileSync('./tree.json', 'utf8');
        const parsedData = JSON.parse(rawData);
        const rootNode = Array.isArray(parsedData) ? parsedData[0] : parsedData;

        if (rootNode) {
            console.log("\n" + format(rootNode));
        }
    } catch (error) {
        console.error("Error reading or parsing tree.json:", error);
    }
})();