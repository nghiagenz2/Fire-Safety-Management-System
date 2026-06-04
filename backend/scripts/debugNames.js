const fs = require('fs');
const path = require('path');

const MODEL_PATH = path.resolve(__dirname, '../../frontend/public/model/BconCity.glb');

function parseGlbJson(buffer) {
  const magic = buffer.toString('utf8', 0, 4);
  const version = buffer.readUInt32LE(4);
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.toString('utf8', 16, 20);

  if (magic !== 'glTF' || version !== 2 || jsonChunkType !== 'JSON') {
    throw new Error('Invalid GLB file format');
  }

  return JSON.parse(buffer.toString('utf8', 20, 20 + jsonChunkLength));
}

const gltf = parseGlbJson(fs.readFileSync(MODEL_PATH));
const nodes = gltf.nodes || [];
const escapeNames = nodes
  .map(n => n.name)
  .filter(name => /^Cua_Thoat_Hiem_/i.test(name || ''));

console.log("First 20 escape node names in GLB JSON:");
console.log(escapeNames.slice(0, 20));
