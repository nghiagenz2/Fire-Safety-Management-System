const fs = require("fs");
const path = require("path");
const { pool } = require("../src/config/db");

const MODEL_PATH = path.resolve(
  __dirname,
  "../../frontend/public/model/BconCity.glb",
);
const DEVICE_NAME_PATTERN = /^(tu_chua_chay|binh_chua_chay)/i;

const STATUS_LABEL = {
  active: "Ho\u1ea1t \u0111\u1ed9ng t\u1ed1t",
  warning: "C\u1ea3nh b\u00e1o",
  danger: "H\u1ecfng",
  maintenance: "B\u1ea3o tr\u00ec",
};

function parseGlbJson(buffer) {
  const magic = buffer.toString("utf8", 0, 4);
  const version = buffer.readUInt32LE(4);
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.toString("utf8", 16, 20);

  if (magic !== "glTF" || version !== 2 || jsonChunkType !== "JSON") {
    throw new Error("Invalid GLB file format");
  }

  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonChunkLength));
}

function getFloorOrder(floorName) {
  const normalized = floorName.toLowerCase();
  if (normalized.includes("tret") || normalized.includes("tr\u1ec7t")) return 0;
  const match = floorName.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 999;
}

function getFloorLabel(floorName) {
  const normalized = floorName.toLowerCase();
  if (normalized.includes("tret") || normalized.includes("tr\u1ec7t")) {
    return "T\u1ea7ng tr\u1ec7t";
  }

  const match = floorName.match(/\d+/);
  return match ? `T\u1ea7ng ${match[0]}` : floorName;
}

function getDeviceType(nodeName) {
  return nodeName.toLowerCase().startsWith("tu_chua_chay")
    ? "T\u1ee7 ch\u1eefa ch\u00e1y"
    : "B\u00ecnh ch\u1eefa ch\u00e1y";
}

function getDevicePrefix(nodeName) {
  return nodeName.toLowerCase().startsWith("tu_chua_chay") ? "CAB" : "EXT";
}

function getDeviceSequence(nodeName, indexInFloor) {
  const match = nodeName.match(/_(\d+)(?:\.|$)/);
  return match
    ? match[1].padStart(2, "0")
    : String(indexInFloor + 1).padStart(2, "0");
}

function makeDeviceId(nodeName, floorName, indexInFloor) {
  const prefix = getDevicePrefix(nodeName);
  const floorOrder = getFloorOrder(floorName);
  const floorCode = floorOrder === 0 ? "TR" : `F${floorOrder}`;
  return `${prefix}-${floorCode}-${getDeviceSequence(nodeName, indexInFloor)}`;
}

function generateMaintenanceDue(deviceId) {
  let sum = 0;
  for (let i = 0; i < deviceId.length; i++) {
    sum += deviceId.charCodeAt(i);
  }
  const day = ((sum * 7) % 28 + 1).toString().padStart(2, "0");
  const month = ((sum * 3) % 12 + 1).toString().padStart(2, "0");
  const year = 2026 + (sum % 2);
  return `${day}/${month}/${year}`;
}

function nodeToDevice(node, floorName, indexInFloor) {
  const floor = getFloorLabel(floorName);
  const id = makeDeviceId(node.name, floorName, indexInFloor);

  return {
    id,
    type: getDeviceType(node.name),
    location: floor,
    status: "active",
    status_label: STATUS_LABEL.active,
    maintenance_due: generateMaintenanceDue(id),
    owner_name: "--",
    model: node.name,
    last_inspection: "--",
    install_date: "--",
    quantity: 1,
    condition_note:
      "Thi\u1ebft b\u1ecb \u0111\u01b0\u1ee3c tr\u00edch xu\u1ea5t t\u1eeb m\u00f4 h\u00ecnh BconCity.glb",
    floor,
    glb_node_name: node.name,
    glb_node_index: node.index,
    glb_translation: node.translation ? JSON.stringify(node.translation) : null,
  };
}

function getDevicesFromGlb() {
  const gltf = parseGlbJson(fs.readFileSync(MODEL_PATH));
  const nodes = gltf.nodes || [];
  const floorNodes = nodes
    .map((node, index) => ({ ...node, index }))
    .filter((node) => /^Tang /i.test(node.name || ""))
    .sort((a, b) => getFloorOrder(a.name) - getFloorOrder(b.name));

  const devices = [];

  floorNodes.forEach((floorNode) => {
    const deviceNodes = (floorNode.children || [])
      .map((nodeIndex) => ({ ...(nodes[nodeIndex] || {}), index: nodeIndex }))
      .filter((node) => DEVICE_NAME_PATTERN.test(node.name || ""));

    deviceNodes.forEach((node, indexInFloor) => {
      devices.push(nodeToDevice(node, floorNode.name, indexInFloor));
    });
  });

  return devices;
}

async function importDevices() {
  const devices = getDevicesFromGlb();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DROP TABLE IF EXISTS devices CASCADE;");
    await client.query("DROP TABLE IF EXISTS incidents CASCADE;");
    // Tạo bảng Sự cố thật và đảm bảo nó trống (0 sự cố)
    await client.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        floor TEXT NOT NULL,
        incident_type TEXT NOT NULL,
        status TEXT NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE devices (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT NOT NULL,
        status_label TEXT NOT NULL,
        maintenance_due TEXT,
        owner_name TEXT,
        model TEXT,
        last_inspection TEXT,
        install_date TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        condition_note TEXT,
        floor TEXT,
        glb_node_name TEXT,
        glb_node_index INTEGER,
        glb_translation JSONB,
        geom geometry(Point, 4326),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const device of devices) {
      await client.query(
        `
          INSERT INTO devices (
            id, type, location, status, status_label, maintenance_due, owner_name,
            model, last_inspection, install_date, quantity, condition_note, floor,
            glb_node_name, glb_node_index, glb_translation, updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13,
            $14, $15, $16::jsonb, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            location = EXCLUDED.location,
            status = EXCLUDED.status,
            status_label = EXCLUDED.status_label,
            maintenance_due = EXCLUDED.maintenance_due,
            owner_name = EXCLUDED.owner_name,
            model = EXCLUDED.model,
            last_inspection = EXCLUDED.last_inspection,
            install_date = EXCLUDED.install_date,
            quantity = EXCLUDED.quantity,
            condition_note = EXCLUDED.condition_note,
            floor = EXCLUDED.floor,
            glb_node_name = EXCLUDED.glb_node_name,
            glb_node_index = EXCLUDED.glb_node_index,
            glb_translation = EXCLUDED.glb_translation,
            updated_at = NOW()
        `,
        [
          device.id,
          device.type,
          device.location,
          device.status,
          device.status_label,
          device.maintenance_due,
          device.owner_name,
          device.model,
          device.last_inspection,
          device.install_date,
          device.quantity,
          device.condition_note,
          device.floor,
          device.glb_node_name,
          device.glb_node_index,
          device.glb_translation,
        ],
      );
    }

    await client.query("COMMIT");
    console.log(`Imported ${devices.length} devices into devices table.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    if (require.main === module) {
      await pool.end();
    }
  }
}

module.exports = { importDevices };

if (require.main === module) {
  importDevices().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
