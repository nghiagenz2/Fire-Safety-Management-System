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

if (groundFloorNode && groundFloorNode.children) {
  console.log(`Ground floor node has ${groundFloorNode.children.length} children.`);
  const childDetails = groundFloorNode.children.map(childIdx => {
    const node = nodes[childIdx];
    return {
      index: childIdx,
      name: node.name,
      translation: node.translation,
      rotation: node.rotation,
      scale: node.scale
    };
  });

  // Lọc ra các cửa phòng và cửa thoát hiểm để in ra
  const doors = childDetails.filter(c => c.name && (c.name.toLowerCase().includes('cua_phong') || c.name.toLowerCase().includes('cua_thoat_hiem')));
  console.log("Doors and Escapes in Ground Floor (tầng trệt):");
  console.log(JSON.stringify(doors, null, 2));
} else {
  console.log("Could not find ground floor node children.");
}
