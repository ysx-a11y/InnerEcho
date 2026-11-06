import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const outputDirectory = path.resolve(projectRoot, 'dist-server');

if (path.dirname(outputDirectory) !== projectRoot || path.basename(outputDirectory) !== 'dist-server') {
  throw new Error(`Refusing to clean unexpected build directory: ${outputDirectory}`);
}

fs.rmSync(outputDirectory, { recursive: true, force: true });
