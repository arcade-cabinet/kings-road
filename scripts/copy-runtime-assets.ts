import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, 'public');
const assetsDir = path.join(publicDir, 'assets');
const dracoDir = path.join(assetsDir, 'draco');

const copyFile = (source: string, destination: string) => {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
};

const sqlWasmSource = require.resolve('sql.js/dist/sql-wasm.wasm');
const dracoLoaderSource = require.resolve(
  'three/examples/jsm/loaders/DRACOLoader.js',
);
const dracoSourceDir = path.resolve(
  path.dirname(dracoLoaderSource),
  '../libs/draco',
);

copyFile(sqlWasmSource, path.join(publicDir, 'sql-wasm.wasm'));
copyFile(sqlWasmSource, path.join(assetsDir, 'sql-wasm.wasm'));

for (const filename of [
  'draco_decoder.js',
  'draco_decoder.wasm',
  'draco_wasm_wrapper.js',
]) {
  copyFile(path.join(dracoSourceDir, filename), path.join(dracoDir, filename));
}
