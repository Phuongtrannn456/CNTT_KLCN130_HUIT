import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const projectRoot = process.env.PROJECT_ROOT;
const uaDir = path.join(projectRoot, '.ua');
const assembledGraph = JSON.parse(readFileSync(path.join(uaDir, 'intermediate', 'assembled-graph.json'), 'utf8'));

const frontendNodes = [];
const backendNodes = [];
const mlNodes = [];
const docsNodes = [];
const rootNodes = [];

for (const node of assembledGraph.nodes) {
  if (!node.filePath) continue;
  
  if (node.filePath.startsWith('frontend/')) frontendNodes.push(node.id);
  else if (node.filePath.startsWith('backend/')) backendNodes.push(node.id);
  else if (node.filePath.startsWith('ml-service/')) mlNodes.push(node.id);
  else if (node.filePath.startsWith('docs/') || node.filePath === 'README.md') docsNodes.push(node.id);
  else rootNodes.push(node.id);
}

const layers = [
  { id: "layer:frontend", name: "Frontend", description: "React UI components and assets.", nodeIds: frontendNodes },
  { id: "layer:backend", name: "Backend", description: "Node.js Express backend API.", nodeIds: backendNodes },
  { id: "layer:ml-service", name: "ML Service", description: "Machine learning service layer.", nodeIds: mlNodes },
  { id: "layer:docs", name: "Documentation", description: "Project documentation.", nodeIds: docsNodes },
  { id: "layer:root", name: "Root & Config", description: "Configuration and scripts.", nodeIds: rootNodes }
].filter(l => l.nodeIds.length > 0);

writeFileSync(path.join(uaDir, 'intermediate', 'layers.json'), JSON.stringify(layers, null, 2));
console.log("Generated layers.json");
