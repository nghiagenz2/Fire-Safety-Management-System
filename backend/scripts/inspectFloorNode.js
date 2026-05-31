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

// Tìm node đại diện cho tầng trệt
const groundFloorNode = nodes.find(n => n.name && (n.name.toLowerCase().includes('tret') || n.name.toLowerCase().includes('trệt') || n.name.toLowerCase() === 'tang 0'));
console.log("Ground floor node in GLB JSON:", groundFloorNode);

// Nếu không thấy, liệt kê các node bắt đầu bằng "Tang" hoặc "Tầng" hoặc "floor"
if (!groundFloorNode) {
  const floorNodes = nodes.filter(n => n.name && (/tang/i.test(n.name) || /tầng/i.test(n.name) || /floor/i.test(n.name)));
  console.log("Found floor nodes:", floorNodes.map(f => ({ name: f.name, translation: f.translation, rotation: f.rotation, scale: f.scale })));
}
