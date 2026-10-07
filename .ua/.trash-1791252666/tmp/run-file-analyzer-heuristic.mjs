import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const projectRoot = process.env.PROJECT_ROOT;
const pluginRoot = process.env.PLUGIN_ROOT;
const uaDir = path.join(projectRoot, '.ua');
const tmpDir = path.join(uaDir, 'tmp');
const intermediateDir = path.join(uaDir, 'intermediate');

const batches = JSON.parse(readFileSync(path.join(intermediateDir, 'batches.json'), 'utf8')).batches;

for (const batch of batches) {
  const batchIndex = batch.batchIndex;
  
  // 1. Create input JSON
  const inputPath = path.join(tmpDir, `ua-file-analyzer-input-${batchIndex}.json`);
  const outputPath = path.join(tmpDir, `ua-file-extract-results-${batchIndex}.json`);
  
  writeFileSync(inputPath, JSON.stringify({
    projectRoot,
    batchFiles: batch.files,
    batchImportData: batch.batchImportData
  }));
  
  // 2. Run extract-structure.mjs
  try {
    execSync(`node "${pluginRoot}/skills/understand/extract-structure.mjs" "${inputPath}" "${outputPath}"`, { stdio: 'ignore' });
  } catch (e) {
    console.error(`Error running extract-structure for batch ${batchIndex}`);
    continue;
  }
  
  if (!existsSync(outputPath)) continue;
  
  const extractResults = JSON.parse(readFileSync(outputPath, 'utf8'));
  
  const nodes = [];
  const edges = [];
  
  for (const fileResult of extractResults.results) {
    const filePath = fileResult.path;
    const fileCategory = fileResult.fileCategory;
    
    let nodeType = 'file';
    if (fileCategory === 'config') nodeType = 'config';
    if (fileCategory === 'docs') nodeType = 'document';
    if (fileCategory === 'infra') nodeType = 'service';
    if (fileCategory === 'data') nodeType = 'schema';
    
    const fileId = `${nodeType}:${filePath}`;
    
    nodes.push({
      id: fileId,
      type: nodeType,
      name: path.basename(filePath),
      filePath: filePath,
      summary: `Component responsible for ${path.basename(filePath)} functionality.`,
      tags: [fileCategory, "auto-extracted"],
      complexity: "moderate"
    });
    
    // Functions
    if (fileResult.functions) {
      for (const fn of fileResult.functions) {
        if (fn.endLine - fn.startLine < 10) continue; // Significance filter
        const fnId = `function:${filePath}:${fn.name}`;
        nodes.push({
          id: fnId,
          type: 'function',
          name: fn.name,
          filePath: filePath,
          lineRange: [fn.startLine, fn.endLine],
          summary: `Function ${fn.name}`,
          tags: ["function", "auto-extracted"],
          complexity: "simple"
        });
        edges.push({
          source: fileId,
          target: fnId,
          type: 'contains',
          direction: 'forward',
          weight: 1.0
        });
      }
    }
    
    // Classes
    if (fileResult.classes) {
      for (const cls of fileResult.classes) {
        const clsId = `class:${filePath}:${cls.name}`;
        nodes.push({
          id: clsId,
          type: 'class',
          name: cls.name,
          filePath: filePath,
          lineRange: [cls.startLine, cls.endLine],
          summary: `Class ${cls.name}`,
          tags: ["class", "auto-extracted"],
          complexity: "moderate"
        });
        edges.push({
          source: fileId,
          target: clsId,
          type: 'contains',
          direction: 'forward',
          weight: 1.0
        });
      }
    }
    
    // Imports
    const imports = batch.batchImportData[filePath] || [];
    for (const imp of imports) {
      edges.push({
        source: fileId,
        target: `file:${imp}`, // generic mapping, will be resolved by merge script
        type: 'imports',
        direction: 'forward',
        weight: 0.7
      });
    }
  }
  
  // Write batch output
  writeFileSync(path.join(intermediateDir, `batch-${batchIndex}.json`), JSON.stringify({ nodes, edges }, null, 2));
  console.log(`Wrote batch-${batchIndex}.json with ${nodes.length} nodes and ${edges.length} edges.`);
}
