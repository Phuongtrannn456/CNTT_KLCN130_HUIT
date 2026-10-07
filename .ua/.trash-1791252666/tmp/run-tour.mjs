import { writeFileSync } from 'fs';
import path from 'path';

const projectRoot = process.env.PROJECT_ROOT;
const uaDir = path.join(projectRoot, '.ua');

const tour = [
  {
    order: 1,
    title: "Project Overview",
    description: "Start with the README to understand the project's purpose.",
    nodeIds: ["document:README.md"]
  },
  {
    order: 2,
    title: "Backend API",
    description: "The core Express backend driving the Web3 application.",
    nodeIds: ["file:backend/server.js"]
  },
  {
    order: 3,
    title: "ML Service",
    description: "The AI service layer for advanced scoring and detection.",
    nodeIds: ["file:ml-service/main.py"]
  }
];

writeFileSync(path.join(uaDir, 'intermediate', 'tour.json'), JSON.stringify(tour, null, 2));
console.log("Generated tour.json");
