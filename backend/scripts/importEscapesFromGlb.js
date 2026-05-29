const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

const MODEL_PATH = path.resolve(__dirname, '../../frontend/public/model/BconCity.glb');
const ESCAPE_NAME_PATTERN = /^Cua_Thoat_Hiem_/i;

const STATUS_LABEL = {
  available: 'Khả dụng',
  inspection: 'Cần kiểm tra',
  unavailable: 'Không khả dụng'
};

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

function getFloorOrder(floorName) {
  const normalized = floorName.toLowerCase();
  if (normalized.includes('tret') || normalized.includes('trệt')) return 0;
  const match = floorName.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 999;
}

function getFloorLabel(floorName) {
  const normalized = floorName.toLowerCase();
  if (normalized.includes('tret') || normalized.includes('trệt')) {
    return 'Tầng trệt';
  }

  const match = floorName.match(/\d+/);
  return match ? `Tầng ${match[0]}` : floorName;
}

function getEscapeSequence(nodeName, indexInFloor) {
  const match = nodeName.match(/_(\d+)(?:\.|$)/);
  return match ? match[1].padStart(2, '0') : String(indexInFloor + 1).padStart(2, '0');
}

function makeEscapeId(nodeName, floorName, indexInFloor) {
  const floorOrder = getFloorOrder(floorName);
  const floorCode = floorOrder === 0 ? 'TR' : `F${floorOrder}`;
  return `EXIT-${floorCode}-${getEscapeSequence(nodeName, indexInFloor)}`;
}

function nodeToEscape(node, floorName, indexInFloor) {
  const floor = getFloorLabel(floorName);
  const floorOrder = getFloorOrder(floorName);

  // Generate some status variation based on index for richness
  const isInspection = (floorOrder % 7 === 0 && indexInFloor === 0);
  const status = isInspection ? 'inspection' : 'available';

  return {
    id: makeEscapeId(node.name, floorName, indexInFloor),
    type: 'Cửa thoát hiểm',
    location: floor,
    status,
    status_label: STATUS_LABEL[status],
    last_inspection: `2026-04-${10 + (indexInFloor % 15)}`,
    owner_name: indexInFloor % 2 === 0 ? 'Nguyễn Văn A' : 'Trần Văn B',
    floor,
    room: `Hành lang thoát hiểm ${floor}`,
    connected_to: floorOrder === 0 ? 'Lối ra ngoài tòa nhà' : 'Cầu thang bộ trục B',
    width: '1.2 m',
    clear_height: '2.1 m',
    glb_node_name: node.name,
    glb_node_index: node.index,
    glb_translation: node.translation ? JSON.stringify(node.translation) : null
  };
}

function getEscapesFromGlb() {
  const gltf = parseGlbJson(fs.readFileSync(MODEL_PATH));
  const nodes = gltf.nodes || [];
  const floorNodes = nodes
    .map((node, index) => ({ ...node, index }))
    .filter((node) => /^Tang /i.test(node.name || ''))
    .sort((a, b) => getFloorOrder(a.name) - getFloorOrder(b.name));

  const escapes = [];

  floorNodes.forEach((floorNode) => {
    const escapeNodes = (floorNode.children || [])
      .map((nodeIndex) => ({ ...(nodes[nodeIndex] || {}), index: nodeIndex }))
      .filter((node) => ESCAPE_NAME_PATTERN.test(node.name || ''));

    escapeNodes.forEach((node, indexInFloor) => {
      escapes.push(nodeToEscape(node, floorNode.name, indexInFloor));
    });
  });

  return escapes;
}

async function importEscapes() {
  console.log('Extracting escape routes from 3D model GLB...');
  const escapes = getEscapesFromGlb();
  console.log(`Found ${escapes.length} escape routes in model.`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS escapes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT NOT NULL,
        status_label TEXT NOT NULL,
        last_inspection TEXT,
        owner_name TEXT,
        floor TEXT,
        room TEXT,
        connected_to TEXT,
        width TEXT DEFAULT '--',
        clear_height TEXT DEFAULT '--',
        glb_node_name TEXT,
        glb_node_index INTEGER,
        glb_translation JSONB,
        geom geometry(Point, 4326),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const escape of escapes) {
      await client.query(
        `
          INSERT INTO escapes (
            id, type, location, status, status_label, last_inspection, owner_name,
            floor, room, connected_to, width, clear_height,
            glb_node_name, glb_node_index, glb_translation, updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15::jsonb, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            location = EXCLUDED.location,
            status = EXCLUDED.status,
            status_label = EXCLUDED.status_label,
            last_inspection = EXCLUDED.last_inspection,
            owner_name = EXCLUDED.owner_name,
            floor = EXCLUDED.floor,
            room = EXCLUDED.room,
            connected_to = EXCLUDED.connected_to,
            width = EXCLUDED.width,
            clear_height = EXCLUDED.clear_height,
            glb_node_name = EXCLUDED.glb_node_name,
            glb_node_index = EXCLUDED.glb_node_index,
            glb_translation = EXCLUDED.glb_translation,
            updated_at = NOW()
        `,
        [
          escape.id,
          escape.type,
          escape.location,
          escape.status,
          escape.status_label,
          escape.last_inspection,
          escape.owner_name,
          escape.floor,
          escape.room,
          escape.connected_to,
          escape.width,
          escape.clear_height,
          escape.glb_node_name,
          escape.glb_node_index,
          escape.glb_translation
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`Successfully imported ${escapes.length} escape routes into escapes database table!`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importEscapes().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
