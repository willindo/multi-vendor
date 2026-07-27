import * as fs from 'fs';
import * as path from 'path';

const TARGET_DIRS = ['src', 'app', 'scripts'];
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Core identifier targets
const OPTION_KEYWORDS = [
  'options',
  'variants',
  'sizes',
  'colors',
  'extractOptionValues',
  'extractVariantOptionValues',
  'product_variant_option'
];

// Block roots
const ENTRY_PATTERNS = [
  /return\s*\{/,
  /await\s+query\.graph/,
  /const\s+\w+\s*=\s*/,
  /function\s+\w+/
];

// Explicit noise to filter out
const EXCLUDE_RAW_FIELDS = [
  'id:', 'title:', 'description:', 'handle:', 'thumbnail:',
  'vendor_id:', 'vendor_name:', 'vendor_handle:', 'gender:',
  'age_group:', 'sizing_group:', 'garment_category:',
  'garment_subcategory:', 'fit:', 'pattern:', 'style_type:',
  'occasion:', 'sleeve_type:', 'neck_type:', 'material_type:',
  'material_composition:', 'season:', 'condition:', 'price:',
  'inventory_quantity:', 'merchant_skus:', 'vendor.', 'apparel_detail.',
  'price_set', 'inventory_items', 'totalInventory', 'allPrices'
];

function scanDirectory(dirPath: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return fileList;
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDirectory(fullPath, fileList);
    } else if (FILE_EXTENSIONS.includes(path.extname(fullPath))) {
      fileList.push(fullPath);
    }
  });
  return fileList;
}

function findParentLineIndex(lines: string[], targetIdx: number): number {
  const floor = Math.max(0, targetIdx - 12);
  for (let i = targetIdx; i >= floor; i--) {
    if (ENTRY_PATTERNS.some(rx => rx.test(lines[i]))) {
      return i;
    }
  }
  return targetIdx;
}

function processContextBlocks(filePath: string): string[] {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');
  const extractedSnippets: string[] = [];
  const trackedLines = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const isTargetHit = OPTION_KEYWORDS.some(kw => rawLine.includes(kw));

    if (isTargetHit && !trackedLines.has(i)) {
      const startIdx = findParentLineIndex(lines, i);
      let endIdx = Math.min(lines.length - 1, i + 45); // Extended window for multi-layer mapping blocks

      // Dynamic bracket lookahead balancing
      let openBrackets = 0;
      let closedBrackets = 0;
      for (let j = startIdx; j <= endIdx; j++) {
        openBrackets += (lines[j].match(/[{[]/g) || []).length;
        closedBrackets += (lines[j].match(/[}\]]/g) || []).length;
      }

      let lookAheadLimit = 0;
      while (openBrackets > closedBrackets && endIdx < lines.length - 1 && lookAheadLimit < 100) {
        endIdx++;
        openBrackets += (lines[endIdx].match(/[{[]/g) || []).length;
        closedBrackets += (lines[endIdx].match(/[}\]]/g) || []).length;
        lookAheadLimit++;
      }

      const localizedChunk = lines.slice(startIdx, endIdx + 1);
      const filteredChunk: string[] = [];
      let skippedWithPlaceholder = false;

      // Tracking internal context blocks to preserve maps/declarations
      let activeTargetDepth = 0;

      localizedChunk.forEach((chunkLine) => {
        const trimmed = chunkLine.trim();

        // Check if entering a target options/variants tracking context block
        const entersTargetContext = OPTION_KEYWORDS.some(kw => chunkLine.includes(`${kw}:`) || chunkLine.includes(`${kw}.`));
        if (entersTargetContext) {
          activeTargetDepth++;
        }

        const isStructuralStart = ENTRY_PATTERNS.some(rx => rx.test(chunkLine)) ||
          /^(export|interface|type)/.test(trimmed);

        const isStructuralEnd = /^(\s*\}\s*,\s*|\s*\}\s*\)\s*|\s*\}\s*;?|\s*\]\s*,?|\s*\)\s*;?)$/.test(trimmed);
        const isAllowedOptionField = OPTION_KEYWORDS.some(kw => chunkLine.includes(kw)) || trimmed.startsWith('//');
        const matchesExclusion = EXCLUDE_RAW_FIELDS.some(field => trimmed.includes(field));

        // Always keep line if we are inside an active options block stream OR it meets structural rules
        if ((activeTargetDepth > 0 || isAllowedOptionField || isStructuralStart || isStructuralEnd) && !matchesExclusion) {
          filteredChunk.push(chunkLine);
          skippedWithPlaceholder = false;
        } else {
          if (!skippedWithPlaceholder) {
            const indentation = chunkLine.match(/^\s*/)?.[0] || '  ';
            filteredChunk.push(`${indentation}. . .`);
            skippedWithPlaceholder = true;
          }
        }

        // Decrement depth when moving past structural closure balances
        if (activeTargetDepth > 0 && /^(\s*\}\s*,?\s*|\s*\]\s*,?\s*|\s*\}\s*\)\s*,?\s*)$/.test(trimmed)) {
          // Verify if closing a block line completely matches
          if ((trimmed.match(/[}\]]/g) || []).length >= activeTargetDepth) {
            activeTargetDepth = 0;
          } else {
            activeTargetDepth -= (trimmed.match(/[}\]]/g) || []).length;
          }
        }
      });

      const finalCleanBlock = filteredChunk
        .filter((val, index, arr) => !(val.trim() === '. . .' && arr[index - 1]?.trim() === '. . .'))
        .join('\n');

      if (finalCleanBlock.replace(/\s|\./g, '').length > 0) {
        extractedSnippets.push(finalCleanBlock);
      }

      for (let m = startIdx; m <= endIdx; m++) {
        trackedLines.add(m);
      }
      i = endIdx;
    }
  }

  return extractedSnippets;
}

export default async function runOptionsExtractor() {
  console.log('🔍 Executing complex contextual option property extractor...');
  let sourceFiles: string[] = [];

  TARGET_DIRS.forEach(dir => {
    const dirAbsPath = path.resolve(process.cwd(), dir);
    sourceFiles = sourceFiles.concat(scanDirectory(dirAbsPath));
  });

  let outputText = '';

  sourceFiles.forEach(file => {
    const snippets = processContextBlocks(file);
    if (snippets.length > 0) {
      const relPath = path.relative(process.cwd(), file);
      outputText += `\n-=- FILE: ${relPath} =-=-\n`;
      snippets.forEach(block => {
        outputText += `${block}\n\n-=-\n`;
      });
      outputText += `\n`;
    }
  });

  if (outputText) {
    const finalDestination = path.join(process.cwd(), 'extracted-options-setup.txt');
    fs.writeFileSync(finalDestination, outputText, 'utf8');
    console.log(`\n✅ Done! Structured map segments preserved to:\n📁 ${finalDestination}`);
  } else {
    console.log('❌ Finished. No deep options fields captured.');
  }
}