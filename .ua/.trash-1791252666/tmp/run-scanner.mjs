import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const projectRoot = process.env.PROJECT_ROOT;
const pluginRoot = process.env.PLUGIN_ROOT;
const uaDir = path.join(projectRoot, '.ua');
const tmpDir = path.join(uaDir, 'tmp');

execSync(`node "${pluginRoot}/skills/understand/scan-project.mjs" "${projectRoot}" "${tmpDir}/ua-scan-files.json"`, { stdio: 'inherit' });
const scanFiles = JSON.parse(readFileSync(`${tmpDir}/ua-scan-files.json`, 'utf8'));

const importMapInput = { projectRoot, files: scanFiles.files };
writeFileSync(`${tmpDir}/ua-import-map-input.json`, JSON.stringify(importMapInput));
execSync(`node "${pluginRoot}/skills/understand/extract-import-map.mjs" "${tmpDir}/ua-import-map-input.json" "${tmpDir}/ua-import-map-output.json"`, { stdio: 'inherit' });

const importMapOutput = JSON.parse(readFileSync(`${tmpDir}/ua-import-map-output.json`, 'utf8'));

let name = path.basename(projectRoot);
let description = "Nền tảng Web3 & AI cho Giáo dục Phổ thông";
let frameworks = ["React", "Express", "MongoDB", "Web3"];
let languages = Object.keys(scanFiles.stats.byLanguage).sort();

const scanResult = {
  name,
  description,
  languages,
  frameworks,
  files: scanFiles.files,
  totalFiles: scanFiles.totalFiles,
  filteredByIgnore: scanFiles.filteredByIgnore,
  estimatedComplexity: scanFiles.estimatedComplexity,
  importMap: importMapOutput.importMap
};

writeFileSync(`${uaDir}/intermediate/scan-result.json`, JSON.stringify(scanResult, null, 2));
console.log("Scanner complete. totalFiles:", scanFiles.totalFiles);
