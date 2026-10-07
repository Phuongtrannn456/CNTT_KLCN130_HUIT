import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const projectRoot = process.env.PROJECT_ROOT;
const uaDir = path.join(projectRoot, '.ua');

const assembledGraph = JSON.parse(readFileSync(path.join(uaDir, 'intermediate', 'assembled-graph.json'), 'utf8'));
const layers = JSON.parse(readFileSync(path.join(uaDir, 'intermediate', 'layers.json'), 'utf8'));
const tour = JSON.parse(readFileSync(path.join(uaDir, 'intermediate', 'tour.json'), 'utf8'));
const commitHash = readFileSync(path.join(uaDir, 'tmp', 'commit.txt'), 'utf8').trim();

const finalGraph = {
  meta: {
    projectName: "cntt-klcn130-huit-web3-giao-duc-pho-thong",
    description: "Nền tảng Web3 & AI cho Giáo dục Phổ thông",
    analyzedAt: new Date().toISOString(),
    gitCommitHash: commitHash
  },
  nodes: assembledGraph.nodes,
  edges: assembledGraph.edges,
  layers: layers,
  tour: tour
};

writeFileSync(path.join(uaDir, 'knowledge-graph.json'), JSON.stringify(finalGraph, null, 2));

const scanFiles = JSON.parse(readFileSync(path.join(uaDir, 'tmp', 'ua-scan-files.json'), 'utf8'));

writeFileSync(path.join(uaDir, 'intermediate', 'fingerprint-input.json'), JSON.stringify({
  projectRoot,
  filePaths: scanFiles.files.map(f => f.path),
  gitCommitHash: commitHash
}, null, 2));
