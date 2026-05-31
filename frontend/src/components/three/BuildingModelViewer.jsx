import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_URL = '/model/BconCity.glb';
const FLOOR_27_IDS = new Set(['Tang 27', 'floor_27']);
const FLOOR_27_HIDDEN_MESH_NAMES = new Set(['San_Vien_Ngoai.049']);
const NORMALIZED_FLOOR_27_HIDDEN_MESH_NAMES = new Set(
	[...FLOOR_27_HIDDEN_MESH_NAMES].map((name) => normalizeObjectName(name)),
);
const MODEL_NAME = MODEL_URL.split('/').pop() || 'BconCity.glb';

const sharedDracoLoader = new DRACOLoader();
sharedDracoLoader.setDecoderPath('/draco/');

const sharedGltfLoader = new GLTFLoader();
sharedGltfLoader.setDRACOLoader(sharedDracoLoader);

const modelCache = {
	gltf: null,
	promise: null,
	floors: null,
	summary: null,
	hasMarkedFloor27: false,
};

function loadCachedModel() {
	if (modelCache.gltf) {
		return Promise.resolve(modelCache.gltf);
	}

	if (!modelCache.promise) {
		modelCache.promise = sharedGltfLoader.loadAsync(MODEL_URL).then((gltf) => {
			modelCache.gltf = gltf;
			return gltf;
		});
	}

	return modelCache.promise;
}

function normalizeObjectName(name = '') {
	return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getFloorIdFromName(name = '') {
	const nameLower = name.toLowerCase().trim();
	if (nameLower.includes('tret') || nameLower.includes('trệt')) {
		return 'floor_tret';
	}
	const match = nameLower.match(/\d+/);
	if (match) {
		return `floor_${match[0]}`;
	}
	return nameLower;
}

function getFloorNameById(floorId) {
	if (!floorId) return 'Tầng trệt';
	if (floorId === 'floor_tret') return 'Tầng trệt';
	const num = floorId.replace('floor_', '');
	return `Tầng ${num}`;
}

function hasObjectNameInAncestors(object, normalizedTargetNames) {
	let current = object;
	while (current) {
		if (normalizedTargetNames.has(normalizeObjectName(current.name))) {
			return true;
		}
		current = current.parent;
	}
	return false;
}

function markFloor27HiddenMeshes(gltf) {
	const floor27 = gltf.scene.getObjectByName('Tang 27');
	const searchRoot = floor27 ?? gltf.scene;

	searchRoot.traverse((child) => {
		if (hasObjectNameInAncestors(child, NORMALIZED_FLOOR_27_HIDDEN_MESH_NAMES)) {
			child.traverse((subChild) => {
				if (subChild.isMesh) {
					subChild.userData.hideWhenViewingFloor27 = true;
				}
			});
		}
	});
}

function isFloor27Selected(selectedId) {
	return FLOOR_27_IDS.has(selectedId) || normalizeObjectName(selectedId).includes('27');
}

function isHiddenWhenViewingFloor27(object) {
	return (
		object.userData.hideWhenViewingFloor27 === true ||
		hasObjectNameInAncestors(object, NORMALIZED_FLOOR_27_HIDDEN_MESH_NAMES)
	);
}

function matchFloorId(idA, idB) {
	if (!idA || !idB) return false;
	if (idA === idB) return true;

	const normA = idA.toLowerCase().replace(/[^a-z0-9]/g, '');
	const normB = idB.toLowerCase().replace(/[^a-z0-9]/g, '');
	if (normA === normB) return true;

	const getFloorNum = (value) => {
		if (value.includes('tret') || value.includes('trt')) return 0;
		const match = value.match(/\d+/);
		return match ? parseInt(match[0], 10) : null;
	};

	const numA = getFloorNum(normA);
	const numB = getFloorNum(normB);
	return numA !== null && numB !== null && numA === numB;
}

function countMeshes(object) {
	let meshCount = 0;

	object.traverse((child) => {
		if (child.isMesh) {
			meshCount += 1;
		}
	});

	return meshCount;
}

function assignFloorIdToUnassignedMeshes(gltf) {
	const floorAverages = {};
	gltf.scene.traverse((child) => {
		if (child.isMesh) {
			const fId = child.userData.floorId;
			if (fId) {
				if (!child.geometry.boundingBox) {
					child.geometry.computeBoundingBox();
				}
				const localCenter = new THREE.Vector3();
				child.geometry.boundingBox.getCenter(localCenter);
				child.updateMatrixWorld(true);
				const worldCenter = localCenter.clone().applyMatrix4(child.matrixWorld);

				if (!floorAverages[fId]) {
					floorAverages[fId] = { sum: 0, count: 0 };
				}
				floorAverages[fId].sum += worldCenter.y;
				floorAverages[fId].count += 1;
			}
		}
	});

	const floorHeights = [];
	for (const fId in floorAverages) {
		floorHeights.push({
			id: fId,
			avgY: floorAverages[fId].sum / floorAverages[fId].count
		});
	}

	if (floorHeights.length > 0) {
		gltf.scene.traverse((child) => {
			if (child.isMesh && !child.userData.floorId) {
				if (!child.geometry.boundingBox) {
					child.geometry.computeBoundingBox();
				}
				const localCenter = new THREE.Vector3();
				child.geometry.boundingBox.getCenter(localCenter);
				child.updateMatrixWorld(true);
				const worldCenter = localCenter.clone().applyMatrix4(child.matrixWorld);

				let closestFloor = floorHeights[0].id;
				let minDiff = Math.abs(worldCenter.y - floorHeights[0].avgY);
				for (let i = 1; i < floorHeights.length; i++) {
					const diff = Math.abs(worldCenter.y - floorHeights[i].avgY);
					if (diff < minDiff) {
						minDiff = diff;
						closestFloor = floorHeights[i].id;
					}
				}
				child.userData.floorId = closestFloor;
			}
		});
	}
}

function getFloorNodes(gltf) {
	// --- Cách 1: Thử quét theo cấu trúc Hierarchy từ Blender (khi bật "Full Collection Hierarchy") ---
	let hierarchyFloors = [];
	gltf.scene.traverse((child) => {
		if ((child.isGroup || child.isObject3D) && child.name) {
			const nameLower = child.name.toLowerCase().trim();
			if (nameLower.startsWith('tang') || nameLower.startsWith('tầng') || nameLower.startsWith('floor')) {
				const meshes = [];
				child.traverse((subChild) => {
					if (subChild.isMesh) {
						meshes.push(subChild);
					}
				});

				if (meshes.length > 0) {
					hierarchyFloors.push({
						id: child.name,
						name: child.name.replace(/_/g, ' '),
						type: child.type,
						meshCount: meshes.length,
						object: child,
					});
				}
			}
		}
	});

	if (hierarchyFloors.length > 0) {
		console.log('Successfully detected floors using GLTF Collection Hierarchy:', hierarchyFloors.length);
		// Sắp xếp tầng từ thấp đến cao (Trệt -> 1 -> 2...)
		hierarchyFloors.sort((a, b) => {
			const getFloorOrder = (name) => {
				const nameLower = name.toLowerCase();
				if (nameLower.includes('tret') || nameLower.includes('trệt')) return 0;
				const match = name.match(/\d+/);
				return match ? parseInt(match[0], 10) : 99;
			};
			return getFloorOrder(a.name) - getFloorOrder(b.name);
		});

		// Gán floorId cho từng mesh con trực thuộc
		hierarchyFloors.forEach((floor) => {
			const normalizedId = getFloorIdFromName(floor.id);
			floor.object.traverse((child) => {
				if (child.isMesh) {
					child.userData.floorId = normalizedId;
				}
			});
			floor.id = normalizedId;
		});

		// Đóng dấu null cho tất cả các mesh không thuộc tầng nào
		gltf.scene.traverse((child) => {
			if (child.isMesh && !child.userData.floorId) {
				child.userData.floorId = null;
			}
		});

		assignFloorIdToUnassignedMeshes(gltf);
		return hierarchyFloors.map(({ id, name, type, meshCount }) => ({ id, name, type, meshCount }));
	}

	// --- Cấu hình Fallback nếu GLB không có sẵn cấu trúc Collection Hierarchy ---
	console.log('No Collection Hierarchy found in GLB. Falling back to mesh analysis...');

	// Thu thập tất cả các Mesh trong scene Three.js
	const allMeshes = [];
	gltf.scene.traverse((child) => {
		if (child.isMesh) {
			allMeshes.push(child);
		}
	});

	// Tìm các node glTF gốc bằng cách loại bỏ các primitive bị tách bởi GLTFLoader
	const gltfMeshNodes = [];
	const seenNodes = new Set();
	allMeshes.forEach((child) => {
		let node = child;
		if (child.parent && child.parent.isGroup && child.parent.name) {
			if (child.name.startsWith(child.parent.name) || child.name === child.parent.name) {
				node = child.parent;
			}
		}
		if (!seenNodes.has(node.uuid)) {
			seenNodes.add(node.uuid);
			gltfMeshNodes.push(node);
		}
	});

	const isBconCity = MODEL_URL.includes('BconCity.glb');

	// --- Cấu hình 1: Cho file BconCity.glb (Phân tầng chính xác theo Blender Outliner) ---
	if (isBconCity) {
		console.log('Detected BconCity.glb. Slicing floors according to Blender Outliner object counts...');
		const floorDefinitions = [
			{ id: 'floor_tret', name: 'Tầng trệt', count: 199 },
			{ id: 'floor_1', name: 'Tầng 1', count: 199 },
			{ id: 'floor_2', name: 'Tầng 2', count: 199 },
			{ id: 'floor_3', name: 'Tầng 3', count: 199 },
			{ id: 'floor_4', name: 'Tầng 4', count: 409 },
			{ id: 'floor_5', name: 'Tầng 5', count: 409 },
			{ id: 'floor_6', name: 'Tầng 6', count: 409 },
			{ id: 'floor_7', name: 'Tầng 7', count: 409 },
			{ id: 'floor_8', name: 'Tầng 8', count: 356 },
			{ id: 'floor_9', name: 'Tầng 9', count: 350 },
			{ id: 'floor_10', name: 'Tầng 10', count: 350 },
			{ id: 'floor_11', name: 'Tầng 11', count: 350 },
			{ id: 'floor_12', name: 'Tầng 12', count: 350 },
			{ id: 'floor_13', name: 'Tầng 13', count: 350 },
			{ id: 'floor_14', name: 'Tầng 14', count: 350 },
			{ id: 'floor_15', name: 'Tầng 15', count: 350 },
			{ id: 'floor_16', name: 'Tầng 16', count: 350 },
			{ id: 'floor_17', name: 'Tầng 17', count: 350 },
			{ id: 'floor_18', name: 'Tầng 18', count: 350 },
			{ id: 'floor_19', name: 'Tầng 19', count: 350 },
			{ id: 'floor_20', name: 'Tầng 20', count: 350 },
			{ id: 'floor_21', name: 'Tầng 21', count: 350 },
			{ id: 'floor_22', name: 'Tầng 22', count: 350 },
			{ id: 'floor_23', name: 'Tầng 23', count: 350 },
			{ id: 'floor_24', name: 'Tầng 24', count: 350 },
			{ id: 'floor_25', name: 'Tầng 25', count: 350 },
			{ id: 'floor_26', name: 'Tầng 26', count: 350 },
			{ id: 'floor_27', name: 'Tầng 27', count: 351 }
		];

		let currentIndex = 0;
		const floors = [];

		floorDefinitions.forEach((def) => {
			const startIndex = currentIndex;
			const endIndex = Math.min(startIndex + def.count, gltfMeshNodes.length);
			const slicedNodes = gltfMeshNodes.slice(startIndex, endIndex);

			slicedNodes.forEach((node) => {
				node.traverse((subChild) => {
					if (subChild.isMesh) {
						subChild.userData.floorId = def.id;
					}
				});
			});

			if (slicedNodes.length > 0) {
				floors.push({
					id: def.id,
					name: def.name,
					type: 'Group',
					meshCount: def.count, // Hiển thị số lượng mesh khớp với Blender
				});
			}

			currentIndex = endIndex;
		});

		// Đóng dấu null cho mesh dư thừa nếu có
		for (let i = currentIndex; i < gltfMeshNodes.length; i++) {
			gltfMeshNodes[i].traverse((subChild) => {
				if (subChild.isMesh) {
					subChild.userData.floorId = null;
				}
			});
		}

		assignFloorIdToUnassignedMeshes(gltf);
		console.log('BconCity.glb loaded. Floors mapped:', floors);
		return floors;
	}

	// --- Cấu hình 2: Chế độ Dynamic Clustering (Fallback cho các file 3D khác) ---
	console.log('Using dynamic Y-height clustering fallback...');
	const yMappedMeshes = [];
	allMeshes.forEach((mesh) => {
		if (!mesh.geometry.boundingBox) {
			mesh.geometry.computeBoundingBox();
		}
		const localCenter = new THREE.Vector3();
		mesh.geometry.boundingBox.getCenter(localCenter);
		mesh.updateMatrixWorld(true);
		const worldCenter = localCenter.clone().applyMatrix4(mesh.matrixWorld);

		yMappedMeshes.push({
			mesh: mesh,
			y: worldCenter.y
		});
	});

	if (yMappedMeshes.length === 0) return [];
	yMappedMeshes.sort((a, b) => a.y - b.y);

	const clusteredFloors = [];
	let currentFloorMeshes = [yMappedMeshes[0].mesh];
	let currentFloorYSum = yMappedMeshes[0].y;
	let floorIndex = 0;
	const CLUSTER_THRESHOLD = 2.5;

	for (let i = 1; i < yMappedMeshes.length; i++) {
		const item = yMappedMeshes[i];
		const avgY = currentFloorYSum / currentFloorMeshes.length;

		if (Math.abs(item.y - avgY) < CLUSTER_THRESHOLD) {
			currentFloorMeshes.push(item.mesh);
			currentFloorYSum += item.y;
		} else {
			const floorName = floorIndex === 0 ? 'Tầng trệt' : `Tầng ${floorIndex}`;
			clusteredFloors.push({
				id: `floor_${floorIndex}`,
				name: floorName,
				type: 'Group',
				meshCount: currentFloorMeshes.length,
				meshes: currentFloorMeshes,
				avgY: avgY
			});

			currentFloorMeshes = [item.mesh];
			currentFloorYSum = item.y;
			floorIndex++;
		}
	}

	if (currentFloorMeshes.length > 0) {
		const avgY = currentFloorYSum / currentFloorMeshes.length;
		const floorName = floorIndex === 0 ? 'Tầng trệt' : `Tầng ${floorIndex}`;
		clusteredFloors.push({
			id: `floor_${floorIndex}`,
			name: floorName,
			type: 'Group',
			meshCount: currentFloorMeshes.length,
			meshes: currentFloorMeshes,
			avgY: avgY
		});
	}

	clusteredFloors.forEach((floor) => {
		floor.meshes.forEach((mesh) => {
			mesh.userData.floorId = floor.id;
		});
	});

	assignFloorIdToUnassignedMeshes(gltf);
	return clusteredFloors.map(({ id, name, type, meshCount }) => ({ id, name, type, meshCount }));
}

function applyFloorVisibility(gltf, selectedId) {
	gltf.scene.traverse((child) => {
		if (child.isMesh) {
			if (selectedId === 'all') {
				child.visible = true;
				return;
			}
			const isSelectedFloorMesh = matchFloorId(child.userData.floorId, selectedId);
			const isHiddenFloor27Ceiling =
				isFloor27Selected(selectedId) &&
				isHiddenWhenViewingFloor27(child);

			child.visible = isSelectedFloorMesh && !isHiddenFloor27Ceiling;
		}
	});
}

function fitCameraToObject(camera, controls, object, options = {}) {
	const box = new THREE.Box3().setFromObject(object);
	const size = box.getSize(new THREE.Vector3());
	const center = box.getCenter(new THREE.Vector3());
	const maxDim = Math.max(size.x, size.y, size.z);
	const fov = (camera.fov * Math.PI) / 180;
	let cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
	const distanceMultiplier = options.distanceMultiplier ?? 1.35;
	const minDistance = options.minDistance ?? 0;
	const elevationRatio = options.elevationRatio ?? 0.5;
	cameraDistance = Math.max(cameraDistance * distanceMultiplier, minDistance);

	camera.position.set(center.x + cameraDistance, center.y + cameraDistance * elevationRatio, center.z + cameraDistance);
	camera.near = Math.max(maxDim / 100, 0.01);
	camera.far = Math.max(maxDim * 100, 1000);
	camera.updateProjectionMatrix();

	controls.target.copy(center);
	controls.update();
}

// WebGL Singleton Context
const globalContext = {
	renderer: null,
	scene: null,
	camera: null,
	controls: null,
	modelRoot: null,
	isModelInitialized: false,
	needsRender: true,
	currentHost: null,
};

function initGlobalWebGL() {
	if (globalContext.renderer) {
		return globalContext;
	}

	const scene = new THREE.Scene();
	scene.background = new THREE.Color('#ffffff');

	const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);

	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.shadowMap.enabled = false;

	const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
	const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xc7d2fe, 1.15);
	const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
	directionalLight.position.set(12, 18, 10);
	directionalLight.castShadow = false;
	const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.0);
	rimLight.position.set(-10, 8, -12);
	const gridHelper = new THREE.GridHelper(240, 24, 0x94a3b8, 0xdbeafe);
	if (Array.isArray(gridHelper.material)) {
		gridHelper.material.forEach((mat) => {
			mat.transparent = true;
			mat.opacity = 0.35;
		});
	} else {
		gridHelper.material.transparent = true;
		gridHelper.material.opacity = 0.35;
	}
	gridHelper.position.y = -1;
	scene.add(ambientLight, hemisphereLight, directionalLight, rimLight, gridHelper);

	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.08;
	controls.minDistance = 2;
	controls.maxDistance = 250;

	controls.addEventListener('change', () => {
		globalContext.needsRender = true;
	});

	globalContext.renderer = renderer;
	globalContext.scene = scene;
	globalContext.camera = camera;
	globalContext.controls = controls;

	return globalContext;
}

// Danh sách tọa độ các nút giao lộ thoát hiểm ở Tầng trệt từ Blender (chuyển đổi sang hệ trục Three.js)
const WAYPOINTS = [
	{ id: 1, x: 6.1118, y: 1.4734, z: -77.143 },
	{ id: 2, x: 28.352, y: 1.4734, z: -77.143 },
	{ id: 3, x: 35.846, y: 1.4734, z: -73.991 },
	{ id: 4, x: 35.846, y: 1.4734, z: -60.864 },
	{ id: 5, x: 35.846, y: 1.4734, z: -39.876 },
	{ id: 6, x: 35.846, y: 1.4734, z: -18.699 },
	{ id: 7, x: 35.846, y: 1.4734, z: -11.003 },
	{ id: 8, x: 12.733, y: 1.4734, z: -11.003 }
];

// Liên kết giữa các nút giao lộ thoát hiểm (Corridor Edges)
const EDGES = [
	[0, 1], // Nút 1 nối Nút 2
	[1, 2], // Nút 2 nối Nút 3
	[2, 3], // Nút 3 nối Nút 4
	[3, 4], // Nút 4 nối Nút 5
	[4, 5], // Nút 5 nối Nút 6
	[5, 6], // Nút 6 nối Nút 7
	[6, 7]  // Nút 7 nối Nút 8
];

// Thuật toán Dijkstra tìm đường đi ngắn nhất đồng thời tránh các điểm cháy trong thời gian thực
function runDijkstra(startIndex, targetIndices, activeFires) {
	const n = WAYPOINTS.length;
	const dist = Array(n).fill(Infinity);
	const parent = Array(n).fill(-1);
	const visited = Array(n).fill(false);

	dist[startIndex] = 0;

	for (let i = 0; i < n; i++) {
		let u = -1;
		let minDist = Infinity;
		for (let j = 0; j < n; j++) {
			if (!visited[j] && dist[j] < minDist) {
				minDist = dist[j];
				u = j;
			}
		}

		if (u === -1 || dist[u] === Infinity) break;
		visited[u] = true;

		// Tìm các đỉnh kề v của u
		const neighbors = [];
		EDGES.forEach(([a, b]) => {
			if (a === u) neighbors.push(b);
			if (b === u) neighbors.push(a);
		});

		for (const v of neighbors) {
			if (visited[v]) continue;

			const wpU = new THREE.Vector3(WAYPOINTS[u].x, WAYPOINTS[u].y, WAYPOINTS[u].z);
			const wpV = new THREE.Vector3(WAYPOINTS[v].x, WAYPOINTS[v].y, WAYPOINTS[v].z);
			let edgeCost = wpU.distanceTo(wpV);

			// Kiểm tra khoảng cách của cạnh/nút đối với đám cháy
			if (activeFires && activeFires.length > 0) {
				for (const fire of activeFires) {
					const distU = wpU.distanceTo(fire.position);
					const distV = wpV.distanceTo(fire.position);
					const minFireDist = Math.min(distU, distV);

					if (minFireDist < 4.0) {
						// Đường đi bị lửa bao vây hoàn toàn (Block)
						edgeCost = Infinity;
						break;
					} else if (minFireDist < 7.5) {
						// Cộng thêm chi phí phạt lớn nếu đi gần vùng cháy (tránh lửa)
						edgeCost += (7.5 - minFireDist) * 350;
					}
				}
			}

			if (edgeCost === Infinity) continue;

			if (dist[u] + edgeCost < dist[v]) {
				dist[v] = dist[u] + edgeCost;
				parent[v] = u;
			}
		}
	}

	let bestTargetIndex = -1;
	let minCost = Infinity;

	targetIndices.forEach((targetIdx) => {
		if (dist[targetIdx] < minCost) {
			minCost = dist[targetIdx];
			bestTargetIndex = targetIdx;
		}
	});

	if (bestTargetIndex === -1) {
		return null;
	}

	const path = [];
	let curr = bestTargetIndex;
	while (curr !== -1) {
		path.push(curr);
		curr = parent[curr];
	}
	return path.reverse();
}

function BuildingModelViewer({
	className = '',
	showHeader = true,
	showCaption = true,
	showFloorSelector = true,
	title = 'Mô hình 3D tòa nhà',
	ariaLabel = 'Mô hình 3D tòa nhà',
	highlightExits = false,
	selectedFloorId: propSelectedFloorId,
	defaultFloorId = 'all',
	focusedNodeName = '',
	focusedNodeHighlightColor = '#f97316',
	highlightedEscape = null,
	onDoorsLoaded,
	onFloorChange,
	onSelectedFloorChange,
	onFloorsLoaded,

	// New simulation props (prefixed to distinguish from resolved values)
	simulationActive: propSimulationActive,
	simulationOrigin: propSimulationOrigin,
	simulationLevel: propSimulationLevel,
	simulationElapsedMs: propSimulationElapsedMs,
}) {
	const canvasHostRef = useRef(null);
	const gltfRef = useRef(null);
	const exitDoorsRef = useRef([]);
	const markersRef = useRef([]);
	const highlightExitsRef = useRef(highlightExits);
	const activeFiresRef = useRef([]);
	const lastHandledFocusRef = useRef(null);
	const selectedExitNodeNameRef = useRef('');
	const focusedMaterialRestoreRef = useRef(new Map());

	// Quản lý Mesh và hoạt ảnh đường thoát hiểm neon
	const pathMeshesRef = useRef([]);
	const pathCurveRef = useRef(null);
	const pathPulsesRef = useRef(null);
	const startMarkerRef = useRef(null);

	const [escapeStartDoor, setEscapeStartDoor] = useState('');
	const [roomDoors, setRoomDoors] = useState([]);
	const [pathBlocked, setPathBlocked] = useState(false);

	const onDoorsLoadedRef = useRef(onDoorsLoaded);
	useEffect(() => {
		onDoorsLoadedRef.current = onDoorsLoaded;
	}, [onDoorsLoaded]);

	// Sync states for auto-synchronized simulation from backend
	const [syncSimulationActive, setSyncSimulationActive] = useState(false);
	const [syncSimulationOrigin, setSyncSimulationOrigin] = useState('');
	const [syncSimulationLevel, setSyncSimulationLevel] = useState('medium');
	const [syncSelectedFloorId, setSyncSelectedFloorId] = useState('floor_tret');
	const [syncSimulationElapsedMs, setSyncSimulationElapsedMs] = useState(0);

	const isSimulationControlled = propSimulationActive !== undefined;

	const simulationActive = isSimulationControlled ? propSimulationActive : syncSimulationActive;
	const simulationOrigin = isSimulationControlled ? propSimulationOrigin : syncSimulationOrigin;
	const simulationLevel = isSimulationControlled ? propSimulationLevel : syncSimulationLevel;
	const simulationElapsedMs = propSimulationElapsedMs !== undefined ? propSimulationElapsedMs : syncSimulationElapsedMs;
	const simulationFloorId = isSimulationControlled ? propSelectedFloorId : syncSelectedFloorId;

	const [isLoading, setIsLoading] = useState(!modelCache.gltf);
	const [modelLoaded, setModelLoaded] = useState(false);
	const [loadingError, setLoadingError] = useState('');
	const [floorNodes, setFloorNodes] = useState(modelCache.floors || []);
	const [internalFloorId, setInternalFloorId] = useState(defaultFloorId);

	const [showFireNotification, setShowFireNotification] = useState(false);
	const prevSimulationActiveRef = useRef(false);

	// Auto-navigate to fire floor once on simulation start, and manage warning notification
	useEffect(() => {
		if (simulationActive) {
			setShowFireNotification(true);
			if (!prevSimulationActiveRef.current && syncSelectedFloorId && !isSimulationControlled) {
				setSelectedFloorId(syncSelectedFloorId);
			}
		} else {
			setShowFireNotification(false);
		}
		prevSimulationActiveRef.current = simulationActive;
	}, [simulationActive, syncSelectedFloorId, isSimulationControlled]);

	const selectedFloorId = propSelectedFloorId !== undefined
		? propSelectedFloorId
		: internalFloorId;

	const setSelectedFloorId = (floorId) => {
		setInternalFloorId(floorId);
		if (onFloorChange) {
			onFloorChange(floorId);
		}
		if (onSelectedFloorChange) {
			onSelectedFloorChange(floorId);
		}
	};
	const [modelSummary, setModelSummary] = useState(modelCache.summary || { name: MODEL_NAME, meshCount: 0 });

	const getFocusedNodeName = (focusedNode) => {
		if (!focusedNode) return '';
		return typeof focusedNode === 'object' ? (focusedNode.name || '') : focusedNode;
	};
	const clearFocusedMaterial = () => {
		focusedMaterialRestoreRef.current.forEach((material, childMesh) => {
			childMesh.material = material;
		});
		focusedMaterialRestoreRef.current.clear();
		globalContext.needsRender = true;
	};
	const highlightedNodeName = highlightedEscape?.glbNodeName || '';
	const resolvedFocusedNodeName = focusedNodeName || highlightedNodeName;

	useEffect(() => {
		if (typeof onFloorsLoaded === 'function' && floorNodes.length > 0) {
			onFloorsLoaded(floorNodes);
		}
	}, [floorNodes, onFloorsLoaded]);

	// Đồng bộ hóa các state sang Ref để giải quyết lỗi closure tĩnh (stale closure) trong vòng lặp WebGL (60 FPS)
	const escapeStartDoorRef = useRef(escapeStartDoor);
	const simulationActiveRef = useRef(simulationActive);
	const selectedFloorIdRef = useRef(selectedFloorId);

	const clearPathTubeOnly = () => {
		pathMeshesRef.current.forEach((mesh) => {
			if (globalContext.scene) {
				globalContext.scene.remove(mesh);
			}
			if (mesh.geometry) mesh.geometry.dispose();
			if (mesh.material) {
				if (Array.isArray(mesh.material)) {
					mesh.material.forEach((m) => m.dispose());
				} else {
					mesh.material.dispose();
				}
			}
		});
		pathMeshesRef.current = [];
		pathCurveRef.current = null;
		pathPulsesRef.current = null;
	};

	// Hàm dọn dẹp các đường thoát hiểm cũ
	const clearEscapePath = () => {
		clearPathTubeOnly();

		if (startMarkerRef.current) {
			if (globalContext.scene) {
				globalContext.scene.remove(startMarkerRef.current.sphere);
				globalContext.scene.remove(startMarkerRef.current.ring);
			}
			startMarkerRef.current.sphere.geometry.dispose();
			startMarkerRef.current.sphere.material.dispose();
			startMarkerRef.current.ring.geometry.dispose();
			startMarkerRef.current.ring.material.dispose();
			startMarkerRef.current = null;
		}
	};

	// Hàm vẽ ống Neon 3D phát sáng và thiết lập các hạt chạy dọc ống
	const drawPathTube = (pathPoints) => {
		clearPathTubeOnly();
		if (pathPoints.length < 2) return;

		try {
			const curvePath = new THREE.CurvePath();
			for (let i = 0; i < pathPoints.length - 1; i++) {
				const lineCurve = new THREE.LineCurve3(pathPoints[i], pathPoints[i + 1]);
				curvePath.add(lineCurve);
			}
			const tubeGeom = new THREE.TubeGeometry(curvePath, 64, 0.15, 8, false);

			const tubeMat = new THREE.MeshStandardMaterial({
				color: 0x00f3ff,
				emissive: 0x0099ff,
				emissiveIntensity: 2.5,
				transparent: true,
				opacity: 0.85,
				roughness: 0.1,
				metalness: 0.9,
			});

			const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
			globalContext.scene.add(tubeMesh);
			pathMeshesRef.current.push(tubeMesh);

			const pulses = [];
			const numPulses = 4;
			for (let i = 0; i < numPulses; i++) {
				const pulseGeom = new THREE.SphereGeometry(0.3, 10, 10);
				const pulseMat = new THREE.MeshBasicMaterial({
					color: 0x33ffff,
					transparent: true,
					opacity: 0.95,
				});
				const pulseMesh = new THREE.Mesh(pulseGeom, pulseMat);
				globalContext.scene.add(pulseMesh);
				pathMeshesRef.current.push(pulseMesh);

				pulses.push({
					mesh: pulseMesh,
					progress: i / numPulses,
				});
			}

			pathCurveRef.current = curvePath;
			pathPulsesRef.current = pulses;
			globalContext.needsRender = true;
		} catch (err) {
			console.error('Failed to render escape route tube:', err);
		}
	};

	// Hàm chạy tìm đường đi tối ưu dựa trên giải thuật Dijkstra
	const updateEscapePath = () => {
		const floorId = selectedFloorIdRef.current;
		const isSimActive = simulationActiveRef.current;

		if (!gltfRef.current || !isSimActive) {
			clearEscapePath();
			return;
		}

		// Nếu tầng đang xem không phải tầng bị cháy (và không chọn Tất cả tầng) thì ẩn đường thoát đi
		if (floorId !== 'all' && floorId !== simulationFloorId) {
			clearEscapePath();
			return;
		}

		// Xác định tầng mục tiêu cần xử lý (nếu đang giả lập cháy tầng trệt mà người dùng xem 'Tất cả tầng', ta vẫn vẽ đường hành lang tầng trệt)
		const targetFloor = (floorId === 'floor_tret' || (floorId === 'all' && simulationFloorId === 'floor_tret')) ? 'floor_tret' : floorId;

		if (targetFloor === 'floor_tret') {
			setPathBlocked(false);

			const pathPoints = [];
			WAYPOINTS.forEach((wp) => {
				pathPoints.push(new THREE.Vector3(wp.x, wp.y, wp.z));
			});

			pathPoints.forEach((p) => {
				p.y = 1.65;
			});

			// Tạo hiệu ứng radar marker tại vị trí bắt đầu (Nút 1) nếu chưa tồn tại
			if (!startMarkerRef.current && globalContext.scene) {
				const sphereGeom = new THREE.SphereGeometry(0.32, 16, 16);
				const sphereMat = new THREE.MeshBasicMaterial({
					color: 0x00d2ff, // Neon cyan
					transparent: true,
					opacity: 0.95
				});
				const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
				sphereMesh.position.set(6.1118, 1.65, -77.143);

				const ringGeom = new THREE.RingGeometry(0.1, 1.0, 32);
				const ringMat = new THREE.MeshBasicMaterial({
					color: 0x00d2ff,
					side: THREE.DoubleSide,
					transparent: true,
					opacity: 0.8
				});
				const ringMesh = new THREE.Mesh(ringGeom, ringMat);
				ringMesh.rotation.x = Math.PI / 2;
				ringMesh.position.set(6.1118, 1.66, -77.143);

				globalContext.scene.add(sphereMesh);
				globalContext.scene.add(ringMesh);

				startMarkerRef.current = {
					sphere: sphereMesh,
					ring: ringMesh
				};
			}

			drawPathTube(pathPoints);
		} else {
			// Cơ chế dự phòng cho các tầng khác: kết nối trực tiếp đến cửa thoát hiểm an toàn nhất
			let startDoor = escapeStartDoorRef.current;
			if (!startDoor) return;

			const startMesh = gltfRef.current.scene.getObjectByName(startDoor);
			if (!startMesh) {
				clearEscapePath();
				return;
			}
			const startPos = new THREE.Vector3();
			startMesh.getWorldPosition(startPos);

			const exitMeshes = [];
			gltfRef.current.scene.traverse((child) => {
				if (
					child.isMesh &&
					child.name &&
					(child.name.toLowerCase().includes('cua_thoat_hiem') ||
						child.name.toLowerCase().includes('exit_door'))
				) {
					const childFloorId = child.userData.floorId || 'floor_tret';
					if (childFloorId === targetFloor) {
						exitMeshes.push(child);
					}
				}
			});

			let bestExitPos = null;
			let maxFireDist = -1;
			let minExitDist = Infinity;

			exitMeshes.forEach((exitMesh) => {
				const exitPos = new THREE.Vector3();
				exitMesh.getWorldPosition(exitPos);

				const fireDists = activeFiresRef.current.map((fire) => exitPos.distanceTo(fire.position));
				const minFireDist = fireDists.length > 0 ? Math.min(...fireDists) : Infinity;

				const distToStart = startPos.distanceTo(exitPos);

				let safetyScore = minFireDist;
				if (minFireDist < 4.0) {
					safetyScore = -1;
				}

				if (safetyScore > maxFireDist) {
					maxFireDist = safetyScore;
					bestExitPos = exitPos;
					minExitDist = distToStart;
				} else if (safetyScore === maxFireDist && distToStart < minExitDist) {
					bestExitPos = exitPos;
					minExitDist = distToStart;
				}
			});

			if (!bestExitPos || maxFireDist === -1) {
				setPathBlocked(true);
				clearEscapePath();
				return;
			}

			setPathBlocked(false);

			const pathPoints = [startPos.clone(), bestExitPos.clone()];
			pathPoints.forEach((p) => {
				p.y = startPos.y + 0.15;
			});

			drawPathTube(pathPoints);
		}
	};
	// Đồng bộ hóa các state và cập nhật đường đi khi bất kỳ thay đổi nào xảy ra (mô hình tải xong, bật mô phỏng, thay đổi tầng, v.v.)
	useEffect(() => {
		escapeStartDoorRef.current = escapeStartDoor;
		simulationActiveRef.current = simulationActive;
		selectedFloorIdRef.current = selectedFloorId;
		updateEscapePath();
	}, [escapeStartDoor, simulationActive, selectedFloorId, modelLoaded, simulationOrigin]);

	// Lấy danh sách các cửa phòng (Cua_Phong) thuộc tầng đang chọn để cập nhật Dropdown
	useEffect(() => {
		if (gltfRef.current && modelLoaded) {
			const doors = [];
			gltfRef.current.scene.traverse((child) => {
				if (child.isMesh && child.name && child.name.toLowerCase().includes('cua_phong')) {
					const doorFloorId = child.userData.floorId || 'floor_tret';
					if (doorFloorId === selectedFloorId) {
						doors.push(child.name);
					}
				}
			});

			doors.sort();

			// Thêm tùy chọn vị trí mặc định nếu ở tầng trệt
			if (selectedFloorId === 'floor_tret') {
				doors.unshift('Vị trí mặc định (Node 1)');
			}

			setRoomDoors(doors);

			if (doors.length > 0) {
				if (selectedFloorId === 'floor_tret') {
					setEscapeStartDoor('Vị trí mặc định (Node 1)');
				} else {
					const nonFireDoors = doors.filter((d) => d !== simulationOrigin);
					if (nonFireDoors.length > 0) {
						setEscapeStartDoor(nonFireDoors[0]);
					} else {
						setEscapeStartDoor(doors[0]);
					}
				}
			} else {
				setEscapeStartDoor('');
			}
		} else {
			setRoomDoors([]);
			setEscapeStartDoor('');
		}
	}, [selectedFloorId, simulationOrigin, simulationActive, modelLoaded]);

	// Sync simulation status in real-time using EventSource
	useEffect(() => {
		if (isSimulationControlled) {
			return undefined;
		}

		let eventSource = null;
		let reconnectTimeout = null;

		const connectSSE = () => {
			eventSource = new EventSource('/api/incidents/simulation/stream');

			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					const { active, origin, level, floorId, elapsedMs } = data;
					setSyncSimulationActive(active);
					setSyncSimulationOrigin(origin);
					setSyncSimulationLevel(level);
					setSyncSelectedFloorId(floorId);
					setSyncSimulationElapsedMs(elapsedMs || 0);
				} catch (error) {
					console.error('Error parsing SSE event data:', error);
				}
			};

			eventSource.onerror = (error) => {
				console.error('SSE connection error, attempting to reconnect...', error);
				if (eventSource) {
					eventSource.close();
				}
				// Reconnect after 3 seconds
				reconnectTimeout = setTimeout(connectSSE, 3000);
			};
		};

		connectSSE();

		return () => {
			if (eventSource) {
				eventSource.close();
			}
			if (reconnectTimeout) {
				clearTimeout(reconnectTimeout);
			}
		};
	}, [isSimulationControlled]);

	useEffect(() => {
		highlightExitsRef.current = highlightExits;
	}, [highlightExits]);

	useEffect(() => {
		selectedExitNodeNameRef.current = getFocusedNodeName(resolvedFocusedNodeName);
	}, [resolvedFocusedNodeName]);

	useEffect(() => {
		if (!resolvedFocusedNodeName) return;
		const targetName = typeof resolvedFocusedNodeName === 'object' ? resolvedFocusedNodeName.name : resolvedFocusedNodeName;
		const targetTimestamp = typeof resolvedFocusedNodeName === 'object' ? resolvedFocusedNodeName.timestamp : null;

		if (targetTimestamp && lastHandledFocusRef.current === targetTimestamp) {
			return;
		}

		const sanitizeName = (name) => {
			if (!name) return '';
			return name.toLowerCase().replace(/[^a-z0-9]/g, '');
		};
		const sanitizedTarget = sanitizeName(targetName);

		console.log('[Debug3D] focusedNodeName changed. resolved targetName:', targetName, 'sanitizedTarget:', sanitizedTarget, 'modelLoaded:', modelLoaded, 'gltfRef.current is present:', !!gltfRef.current);
		if (gltfRef.current && modelLoaded && sanitizedTarget) {
			let targetObject = null;
			gltfRef.current.scene.traverse((child) => {
				if (child.name) {
					const sanitizedChild = sanitizeName(child.name);
					if (sanitizedChild === sanitizedTarget) {
						targetObject = child;
					}
				}
			});

			console.log('[Debug3D] Target object search result:', targetObject ? `FOUND (${targetObject.type})` : 'NOT FOUND');

			if (targetObject) {
				let meshFloorId = targetObject.userData.floorId;
				if (!meshFloorId) {
					targetObject.traverse((subChild) => {
						if (subChild.userData.floorId) {
							meshFloorId = subChild.userData.floorId;
						}
					});
				}
				console.log('[Debug3D] Target floorId resolved:', meshFloorId, 'current selectedFloorId:', selectedFloorId);

				if (meshFloorId && !matchFloorId(meshFloorId, selectedFloorId)) {
					console.log('[Debug3D] Changing selected floor to:', meshFloorId);
					setSelectedFloorId(meshFloorId);
				} else {
					if (targetTimestamp) {
						lastHandledFocusRef.current = targetTimestamp;
					}

					setTimeout(() => {
						if (globalContext.camera && globalContext.controls) {
							console.log('[Debug3D] Fitting camera to object:', targetObject.name);
							fitCameraToObject(globalContext.camera, globalContext.controls, targetObject, {
								distanceMultiplier: 4.2,
								minDistance: 24,
								elevationRatio: 0.35,
							});
							
							clearFocusedMaterial();
							const focusColor = new THREE.Color(focusedNodeHighlightColor);
							const focusMaterial = new THREE.MeshStandardMaterial({
								color: focusColor,
								emissive: focusColor,
								emissiveIntensity: 2.0,
								roughness: 0.1,
								metalness: 0.9,
							});

							targetObject.traverse((child) => {
								if (child.isMesh) {
									focusedMaterialRestoreRef.current.set(child, child.material);
									child.material = focusMaterial;
								}
							});
							globalContext.needsRender = true;
						} else {
							console.warn('[Debug3D] globalContext camera or controls is missing!');
						}
					}, 300);
				}
			}
		}
	}, [resolvedFocusedNodeName, modelLoaded, selectedFloorId, focusedNodeHighlightColor]);

	useEffect(() => {
		if (gltfRef.current && globalContext.isModelInitialized) {
			const maxAnisotropy = globalContext.renderer.capabilities.getMaxAnisotropy();
			exitDoorsRef.current = [];

			// Clean up previous markers
			markersRef.current.forEach((marker) => {
				globalContext.scene.remove(marker);
				if (marker.geometry) marker.geometry.dispose();
				if (marker.material) {
					if (Array.isArray(marker.material)) {
						marker.material.forEach((m) => m.dispose());
					} else {
						marker.material.dispose();
					}
				}
			});
			markersRef.current = [];

			globalContext.modelRoot.traverse((child) => {
				if (child.isMesh) {
					if (!child.userData.originalMaterial) {
						child.userData.originalMaterial = child.material;
					}

					const isExit = child.name && (
						child.name.toLowerCase().includes('cua_thoat_hiem') ||
						child.name.toLowerCase().includes('exit_door')
					);

					if (highlightExits && isExit) {
						child.material = new THREE.MeshStandardMaterial({
							color: 0x10b981, // Vibrant emerald green
							emissive: 0x059669, // Emerald glow
							emissiveIntensity: 1.0,
							roughness: 0.2,
							metalness: 0.8,
						});
						exitDoorsRef.current.push(child);

						// Bounding box mapping for marker positioning
						const box = new THREE.Box3().setFromObject(child);
						const center = new THREE.Vector3();
						box.getCenter(center);
						const maxY = box.max.y;
						const markerPosition = new THREE.Vector3(center.x, maxY + 1.2, center.z);

						// Glowing sphere
						const sphereGeom = new THREE.SphereGeometry(0.7, 16, 16);
						const sphereMat = new THREE.MeshBasicMaterial({
							color: 0x00ff88, // Neon green
							transparent: true,
							opacity: 0.85
						});
						const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
						sphereMesh.position.copy(markerPosition);
						sphereMesh.userData = {
							originalY: markerPosition.y,
							bobSpeed: 0.003 + Math.random() * 0.002,
							bobHeight: 0.35,
							floorId: child.userData.floorId,
							doorName: child.name,
						};

						// Glowing outer horizontal ring (Torus)
						const ringGeom = new THREE.TorusGeometry(0.9, 0.08, 8, 24);
						const ringMat = new THREE.MeshBasicMaterial({
							color: 0x00ff88,
							transparent: true,
							opacity: 0.6
						});
						const ringMesh = new THREE.Mesh(ringGeom, ringMat);
						ringMesh.rotation.x = Math.PI / 2;
						ringMesh.position.copy(markerPosition);
						ringMesh.userData = {
							originalY: markerPosition.y,
							bobSpeed: sphereMesh.userData.bobSpeed,
							bobHeight: sphereMesh.userData.bobHeight,
							floorId: child.userData.floorId,
							doorName: child.name,
						};

						// Set initial visibility based on selectedFloorId
						const markerVisible = (selectedFloorId === 'all' || matchFloorId(child.userData.floorId, selectedFloorId));
						sphereMesh.visible = markerVisible;
						ringMesh.visible = markerVisible;

						globalContext.scene.add(sphereMesh);
						globalContext.scene.add(ringMesh);
						markersRef.current.push(sphereMesh, ringMesh);
					} else {
						child.material = child.userData.originalMaterial;
						if (child.material) {
							const materials = Array.isArray(child.material) ? child.material : [child.material];
							materials.forEach((mat) => {
								if (mat.map) {
									mat.map.anisotropy = maxAnisotropy;
									mat.map.needsUpdate = true;
								}
							});
						}
					}
				}
			});
			globalContext.needsRender = true;
		}
	}, [highlightExits, isLoading, selectedFloorId]);

	useEffect(() => {
		if (gltfRef.current) {
			applyFloorVisibility(gltfRef.current, selectedFloorId);

			// Toggle visibility of existing exit markers based on the selected floor
			markersRef.current.forEach((marker) => {
				if (marker.userData && marker.userData.floorId) {
					if (selectedFloorId === 'all') {
						marker.visible = true;
					} else {
						marker.visible = matchFloorId(marker.userData.floorId, selectedFloorId);
					}
				}
			});

			// Toggle visibility of active fire meshes based on the selected floor
			activeFiresRef.current.forEach((fire) => {
				if (fire.mesh && fire.mesh.userData && fire.mesh.userData.floorId) {
					if (selectedFloorId === 'all') {
						fire.mesh.visible = true;
					} else {
						fire.mesh.visible = matchFloorId(fire.mesh.userData.floorId, selectedFloorId);
					}
				}
			});

			globalContext.needsRender = true;
		}
	}, [selectedFloorId]);

	useEffect(() => {
		let isMounted = true;
		let spreadTimer = null;
		const spawnedFires = [];

		const cleanup = () => {
			// Clear all fires from scene
			spawnedFires.forEach((fire) => {
				if (globalContext.scene) {
					globalContext.scene.remove(fire.mesh);
				}
			});
			spawnedFires.length = 0;
			activeFiresRef.current = [];
			if (globalContext) {
				globalContext.needsRender = true;
			}
		};

		if (!simulationActive || !simulationOrigin || !gltfRef.current) {
			cleanup();
			return undefined;
		}

		// Find the starting door object in the scene
		const originMesh = gltfRef.current.scene.getObjectByName(simulationOrigin);
		if (!originMesh) {
			console.warn(`Simulation origin door "${simulationOrigin}" not found in model.`);
			return undefined;
		}

		const originPos = new THREE.Vector3();
		originMesh.getWorldPosition(originPos);

		// Adjust Y coordinate so the fire sits nicely on the floor (not halfway through)
		const box = new THREE.Box3().setFromObject(originMesh);
		const minY = box.min.y;
		originPos.y = minY; // Sit at the base of the door

		const runSimulation = async () => {
			try {
				const fireModel = await sharedGltfLoader.loadAsync('/model/fire.glb');
				if (!isMounted || !simulationActive) return;

				// Compute the local bounding box of the fire model once to auto-correct any pivot offsets in fire.glb
				const fireBox = new THREE.Box3().setFromObject(fireModel.scene);
				const fireCenter = new THREE.Vector3();
				fireBox.getCenter(fireCenter);

				const spawnFireAt = (pos, doorName) => {
					const fireClone = fireModel.scene.clone(true);

					// Scale is always 7.0 regardless of fire level
					const finalScale = 7.0;
					fireClone.scale.set(finalScale, finalScale, finalScale);

					// Align X/Z to the door's center, and Y to the door's base (sitting on floor)
					const adjustedPos = new THREE.Vector3(
						pos.x - fireCenter.x * finalScale,
						pos.y - fireBox.min.y * finalScale,
						pos.z - fireCenter.z * finalScale
					);
					fireClone.position.copy(adjustedPos);

					// Tag the fire mesh with the floor it belongs to
					fireClone.userData = { floorId: simulationFloorId };

					// Set initial visibility based on whether its floor is selected
					fireClone.visible = (selectedFloorId === 'all' || simulationFloorId === selectedFloorId);

					// Store original scale for pulse animation in rendering loop
					const baseScale = new THREE.Vector3(finalScale, finalScale, finalScale);

					globalContext.scene.add(fireClone);

					const fireObj = {
						mesh: fireClone,
						position: pos.clone(), // Use original door position for proximity calculations
						doorName,
						baseScale,
					};
					spawnedFires.push(fireObj);
					activeFiresRef.current = [...spawnedFires];
					globalContext.needsRender = true;
				};

				// 1. Spawn initial fire at origin
				spawnFireAt(originPos, simulationOrigin);

				// 2. Find other doors on the same floor for spreading
				const otherDoors = [];
				gltfRef.current.scene.traverse((child) => {
					if (child.isMesh && child.name && child.name.toLowerCase().includes('cua_phong') && child.name !== simulationOrigin) {
						const doorFloorId = child.userData.floorId || 'floor_tret';
						if (doorFloorId === simulationFloorId) {
							const pos = new THREE.Vector3();
							child.getWorldPosition(pos);

							const doorBox = new THREE.Box3().setFromObject(child);
							pos.y = doorBox.min.y; // Sit on floor

							const dist = originPos.distanceTo(pos);
							otherDoors.push({ mesh: child, position: pos, name: child.name, distance: dist });
						}
					}
				});

				// Sort other doors by distance (closest first)
				otherDoors.sort((a, b) => a.distance - b.distance);

				// Determine maximum number of fires based on simulation level
				let maxFires = 10; // default medium
				if (simulationLevel === 'low') maxFires = 8;
				if (simulationLevel === 'high') maxFires = 12;

				// 3. Calculate how many fires to spawn immediately based on elapsed time
				const firesAlreadySpread = Math.floor(simulationElapsedMs / 2500);

				let doorIdx = 0;
				// Spawn already spread fires immediately
				while (doorIdx < firesAlreadySpread && doorIdx < otherDoors.length && spawnedFires.length < maxFires) {
					const targetDoor = otherDoors[doorIdx];
					spawnFireAt(targetDoor.position, targetDoor.name);
					doorIdx++;
				}

				// If we still have more fires to spread, schedule them
				if (doorIdx < otherDoors.length && spawnedFires.length < maxFires) {
					const remainingTime = 2500 - (simulationElapsedMs % 2500);

					const spawnNext = () => {
						if (!isMounted || !simulationActive) return;
						if (doorIdx >= otherDoors.length || spawnedFires.length >= maxFires) {
							return;
						}
						const targetDoor = otherDoors[doorIdx];
						spawnFireAt(targetDoor.position, targetDoor.name);
						doorIdx++;

						// Set up regular interval for subsequent fires
						spreadTimer = window.setInterval(() => {
							if (doorIdx >= otherDoors.length || spawnedFires.length >= maxFires) {
								window.clearInterval(spreadTimer);
								return;
							}
							const nextDoor = otherDoors[doorIdx];
							spawnFireAt(nextDoor.position, nextDoor.name);
							doorIdx++;
						}, 2500);
					};

					spreadTimer = window.setTimeout(spawnNext, remainingTime);
				}

			} catch (err) {
				console.error('Failed to load fire.glb model:', err);
			}
		};

		runSimulation();

		return () => {
			isMounted = false;
			if (spreadTimer) {
				window.clearTimeout(spreadTimer);
				window.clearInterval(spreadTimer);
			}
			cleanup();
		};
	}, [simulationActive, simulationOrigin, simulationLevel, simulationFloorId, modelLoaded, simulationElapsedMs]);

	useEffect(() => {
		const hostElement = canvasHostRef.current;
		if (!hostElement) {
			return undefined;
		}

		const ctx = initGlobalWebGL();
		const { renderer, scene, camera, controls } = ctx;

		// Attach renderer's canvas to current host container
		hostElement.appendChild(renderer.domElement);
		ctx.currentHost = hostElement;
		ctx.needsRender = true;

		// Xử lý sự kiện click chuột để chọn điểm xuất phát thoát hiểm trực tiếp trên mô hình 3D
		const handleCanvasClick = (event) => {
			if (!gltfRef.current || !simulationActiveRef.current) return;

			const rect = renderer.domElement.getBoundingClientRect();
			const mouse = new THREE.Vector2(
				((event.clientX - rect.left) / rect.width) * 2 - 1,
				-((event.clientY - rect.top) / rect.height) * 2 + 1
			);

			const raycaster = new THREE.Raycaster();
			raycaster.setFromCamera(mouse, camera);

			const doorsToIntersect = [];
			gltfRef.current.scene.traverse((child) => {
				if (child.isMesh && child.name && child.name.toLowerCase().includes('cua_phong')) {
					const doorFloorId = child.userData.floorId || 'floor_tret';
					if (doorFloorId === selectedFloorIdRef.current) {
						doorsToIntersect.push(child);
					}
				}
			});

			const intersects = raycaster.intersectObjects(doorsToIntersect, true);
			if (intersects.length > 0) {
				const clickedDoor = intersects[0].object;
				console.log("Người dùng chọn điểm xuất phát bằng click 3D:", clickedDoor.name);
				setEscapeStartDoor(clickedDoor.name);
			}
		};

		renderer.domElement.addEventListener('click', handleCanvasClick);

		let animationFrameId = 0;
		let loadTimerId = 0;
		let disposed = false;
		let resizeObserver = null;

		const triggerDoorsLoaded = (gltfModel) => {
			if (!onDoorsLoadedRef.current) return;
			const doorsByFloor = {};
			gltfModel.scene.traverse((child) => {
				if (child.isMesh && child.name && child.name.toLowerCase().includes('cua_phong')) {
					const floorId = child.userData.floorId || 'floor_tret';
					if (!doorsByFloor[floorId]) {
						doorsByFloor[floorId] = [];
					}
					if (!doorsByFloor[floorId].includes(child.name)) {
						doorsByFloor[floorId].push(child.name);
					}
				}
			});
			onDoorsLoadedRef.current(doorsByFloor);
		};

		const handleResize = () => {
			const { clientWidth, clientHeight } = hostElement;
			if (!clientWidth || !clientHeight) {
				return;
			}

			camera.aspect = clientWidth / clientHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(clientWidth, clientHeight, false);
			ctx.needsRender = true;
		};

		let lastProximityCheckTime = 0;

		const animate = () => {
			const controlsUpdated = controls.update();
			let needsPulseRender = false;
			const now = Date.now();
			const doProximityCheck = (now - lastProximityCheckTime > 250);
			if (doProximityCheck) {
				lastProximityCheckTime = now;
			}

			if (highlightExitsRef.current && exitDoorsRef.current.length > 0) {
				const time = now * 0.004;
				const intensity = 0.3 + Math.abs(Math.sin(time)) * 0.8;
				const selectedExitName = normalizeObjectName(selectedExitNodeNameRef.current);
				exitDoorsRef.current.forEach((door) => {
					const isSelectedExit = selectedExitName && normalizeObjectName(door.name) === selectedExitName;
					if (doProximityCheck) {
						let isNearFire = false;
						if (activeFiresRef.current && activeFiresRef.current.length > 0) {
							if (!door.userData.worldPosition) {
								door.userData.worldPosition = new THREE.Vector3();
								door.getWorldPosition(door.userData.worldPosition);
							}
							const doorPos = door.userData.worldPosition;
							const doorFloorId = door.userData.floorId || 'floor_tret';

							for (const fire of activeFiresRef.current) {
								const fireFloorId = (fire.mesh && fire.mesh.userData && fire.mesh.userData.floorId) || 'floor_tret';
								if (doorFloorId !== fireFloorId) {
									continue;
								}

								const dx = doorPos.x - fire.position.x;
								const dz = doorPos.z - fire.position.z;
								const dist2D = Math.sqrt(dx * dx + dz * dz);
								if (dist2D < 6.0) {
									isNearFire = true;
									break;
								}
							}
						}
						door.userData.isNearFire = isNearFire;
					}

					if (door.material && door.material.isMaterial) {
						if (isSelectedExit) {
							door.material.color.setHex(0x3b82f6);
							door.material.emissive.setHex(0x1d4ed8);
							door.material.emissiveIntensity = intensity * 1.2;
						} else if (door.userData.isNearFire) {
							// Red warning color and higher pulsing intensity
							door.material.color.setHex(0xef4444);
							door.material.emissive.setHex(0xef4444);
							door.material.emissiveIntensity = intensity * 1.5;
						} else {
							// Reset to normal green color
							door.material.color.setHex(0x10b981);
							door.material.emissive.setHex(0x059669);
							door.material.emissiveIntensity = intensity;
						}
					}
				});
				needsPulseRender = true;
			}

			if (highlightExitsRef.current && markersRef.current.length > 0) {
				const selectedExitName = normalizeObjectName(selectedExitNodeNameRef.current);
				markersRef.current.forEach((marker) => {
					if (!marker.visible) return;
					const markerDoorName = marker.userData?.doorName || '';
					const isSelectedExit = selectedExitName && normalizeObjectName(markerDoorName) === selectedExitName;
					if (marker.userData && marker.userData.originalY !== undefined) {
						const bob = Math.sin(now * marker.userData.bobSpeed) * marker.userData.bobHeight;
						marker.position.y = marker.userData.originalY + bob;

						if (doProximityCheck) {
							let isNearFire = false;
							if (activeFiresRef.current && activeFiresRef.current.length > 0) {
								const markerFloorId = marker.userData.floorId || 'floor_tret';

								for (const fire of activeFiresRef.current) {
									const fireFloorId = (fire.mesh && fire.mesh.userData && fire.mesh.userData.floorId) || 'floor_tret';
									if (markerFloorId !== fireFloorId) {
										continue;
									}

									const dx = marker.position.x - fire.position.x;
									const dz = marker.position.z - fire.position.z;
									const dist2D = Math.sqrt(dx * dx + dz * dz);
									if (dist2D < 6.0) {
										isNearFire = true;
										break;
									}
								}
							}
							marker.userData.isNearFire = isNearFire;
						}

						if (isSelectedExit) {
							marker.material.color.setHex(0x3b82f6);
							const scale = 1.1 + Math.sin(now * 0.012) * 0.22;
							marker.scale.set(scale, scale, scale);
						} else if (marker.userData.isNearFire) {
							// Flash red and pulse faster
							marker.material.color.setHex(0xef4444);
							const scale = 1.0 + Math.sin(now * 0.016) * 0.35;
							marker.scale.set(scale, scale, scale);
						} else {
							// Normal neon green
							marker.material.color.setHex(0x00ff88);
							const scale = 1.0 + Math.sin(now * 0.008) * 0.25;
							marker.scale.set(scale, scale, scale);
						}
					}
				});
				needsPulseRender = true;
			}

			// Cập nhật vị trí các hạt neon phát sáng di chuyển dọc theo đường đi (chạy ở tốc độ 60 FPS)
			if (pathPulsesRef.current && pathCurveRef.current) {
				const speed = 0.003;
				pathPulsesRef.current.forEach((pulse) => {
					pulse.progress += speed;
					if (pulse.progress > 1.0) {
						pulse.progress = 0.0;
					}
					const pos = pathCurveRef.current.getPointAt(pulse.progress);
					pulse.mesh.position.copy(pos);
				});
				needsPulseRender = true;
			}

			// Cập nhật hoạt ảnh marker radar của vị trí xuất phát
			if (startMarkerRef.current) {
				const time = now * 0.003;
				// Quả cầu nhấp nhô lơ lửng nhẹ nhàng
				startMarkerRef.current.sphere.position.y = 1.65 + Math.sin(time) * 0.12;

				// Vòng tròn radar lan tỏa rộng dần rồi mờ hẳn
				const scaleProgress = (now % 1500) / 1500;
				const scale = 0.5 + scaleProgress * 2.5;
				startMarkerRef.current.ring.scale.set(scale, scale, 1);
				startMarkerRef.current.ring.material.opacity = 0.8 * (1.0 - scaleProgress);
				needsPulseRender = true;
			}

			// Cập nhật đường đi tránh lửa theo chu kỳ quét khoảng cách
			if (doProximityCheck && simulationActiveRef.current) {
				updateEscapePath();
			}

			if (controlsUpdated || ctx.needsRender || needsPulseRender) {
				renderer.render(scene, camera);
				ctx.needsRender = false;
			}
			animationFrameId = window.requestAnimationFrame(animate);
		};

		const loadModel = async () => {
			try {
				setIsLoading(!modelCache.gltf);
				setLoadingError('');

				const gltf = await loadCachedModel();
				if (disposed) {
					return;
				}

				gltfRef.current = gltf;

				if (!ctx.isModelInitialized) {
					ctx.modelRoot = gltf.scene;
					scene.add(ctx.modelRoot);

					// Bật bộ lọc anisotropic filtering để giữ vân bề mặt (texture) sắc nét ở góc nghiêng
					const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
					ctx.modelRoot.traverse((child) => {
						if (child.isMesh && child.material) {
							const materials = Array.isArray(child.material) ? child.material : [child.material];
							materials.forEach((mat) => {
								if (mat.map) {
									mat.map.anisotropy = maxAnisotropy;
									mat.map.needsUpdate = true;
								}
							});
						}
					});

					if (!modelCache.floors) {
						modelCache.floors = getFloorNodes(gltf);
					}

					if (!modelCache.hasMarkedFloor27) {
						markFloor27HiddenMeshes(gltf);
						modelCache.hasMarkedFloor27 = true;
					}

					if (!modelCache.summary) {
						modelCache.summary = {
							name: MODEL_NAME,
							meshCount: countMeshes(ctx.modelRoot),
						};
					}

					fitCameraToObject(camera, controls, ctx.modelRoot);
					ctx.isModelInitialized = true;
				}

				applyFloorVisibility(gltf, selectedFloorId);

				setFloorNodes(modelCache.floors);
				setModelSummary(modelCache.summary);
				triggerDoorsLoaded(gltf);

				handleResize();
				ctx.needsRender = true;
			} catch (error) {
				console.error(error);
				setLoadingError(`Không tải được model 3D. Kiểm tra lại file ${MODEL_NAME}.`);
			} finally {
				setIsLoading(false);
				setModelLoaded(true);
			}
		};

		if (modelCache.gltf && ctx.isModelInitialized) {
			gltfRef.current = modelCache.gltf;
			applyFloorVisibility(modelCache.gltf, selectedFloorId);
			setFloorNodes(modelCache.floors);
			setModelSummary(modelCache.summary);
			triggerDoorsLoaded(modelCache.gltf);
			handleResize();
			ctx.needsRender = true;
			setIsLoading(false);
			setModelLoaded(true);
		} else {
			if (modelCache.gltf) {
				loadModel();
			} else {
				loadTimerId = window.setTimeout(loadModel, 80);
			}
		}

		animate();

		if (typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver(handleResize);
			resizeObserver.observe(hostElement);
		} else {
			window.addEventListener('resize', handleResize);
		}

		return () => {
			disposed = true;
			if (loadTimerId) {
				window.clearTimeout(loadTimerId);
			}
			window.cancelAnimationFrame(animationFrameId);

			if (resizeObserver) {
				resizeObserver.disconnect();
			} else {
				window.removeEventListener('resize', handleResize);
			}

			// Clean up exit markers
			markersRef.current.forEach((marker) => {
				scene.remove(marker);
				if (marker.geometry) marker.geometry.dispose();
				if (marker.material) {
					if (Array.isArray(marker.material)) {
						marker.material.forEach((m) => m.dispose());
					} else {
						marker.material.dispose();
					}
				}
			});
			markersRef.current = [];

			clearFocusedMaterial();

			// Clean up escape path meshes
			pathMeshesRef.current.forEach((mesh) => {
				scene.remove(mesh);
				if (mesh.geometry) mesh.geometry.dispose();
				if (mesh.material) {
					if (Array.isArray(mesh.material)) {
						mesh.material.forEach((m) => m.dispose());
					} else {
						mesh.material.dispose();
					}
				}
			});
			pathMeshesRef.current = [];

			renderer.domElement.removeEventListener('click', handleCanvasClick);

			if (renderer.domElement.parentNode === hostElement) {
				hostElement.removeChild(renderer.domElement);
			}
			if (ctx.currentHost === hostElement) {
				ctx.currentHost = null;
			}
		};
	}, []);

	return (
		<section className={`manager-panel manager-model-card ${className}`.trim()} aria-label={ariaLabel}>
			{showHeader ? (
				<div className="manager-model-header">
					<div>
						{title && <h2 className="typo-h2 manager-title">{title}</h2>}
					</div>
					<span className="manager-model-badge">{floorNodes.length > 0 ? `${floorNodes.length} tầng` : 'GLB'}</span>
				</div>
			) : null}

			{showFloorSelector ? (
				<div className="manager-model-controls" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
					<div className="manager-floor-dropdown-wrap">
						<label htmlFor="floor-select" className="typo-label text-secondary">Chọn tầng hiển thị</label>
						<select
							id="floor-select"
							className="manager-filter-select manager-floor-select"
							value={selectedFloorId === 'all' ? 'all' : (floorNodes.find((floorNode) => matchFloorId(floorNode.id, selectedFloorId))?.id || selectedFloorId)}
							onChange={(e) => setSelectedFloorId(e.target.value)}
						>
							<option value="all">Tất cả tầng (Hiển thị toàn bộ)</option>
							{floorNodes.map((floorNode) => (
								<option key={floorNode.id} value={floorNode.id}>
									{floorNode.name}
								</option>
							))}
						</select>
					</div>
				</div>
			) : null}

			<div className="manager-model-stage" style={{ position: 'relative' }}>
				{showFireNotification && (
					<div className="fire-notification-banner">
						<div className="fire-notification-icon">⚠️</div>
						<div className="fire-notification-content">
							<span className="fire-notification-title">CẢNH BÁO PHÁT HIỆN SỰ CỐ CHÁY!</span>
							<span className="fire-notification-desc">
								Đang có giả lập cháy tại {getFloorNameById(syncSelectedFloorId)} (Khu vực: {syncSimulationOrigin})
							</span>
						</div>
						<div className="fire-notification-actions">
							{selectedFloorId !== syncSelectedFloorId && (
								<button
									className="fire-notification-btn view-btn"
									onClick={() => setSelectedFloorId(syncSelectedFloorId)}
								>
									Xem vị trí cháy
								</button>
							)}
							<button
								className="fire-notification-btn close-btn"
								onClick={() => setShowFireNotification(false)}
							>
								Đóng
							</button>
						</div>
					</div>
				)}

				{simulationActive && pathBlocked && (
					<div className="fire-notification-banner" style={{ background: 'rgba(220, 38, 38, 0.96)', borderColor: '#ef4444', top: showFireNotification ? '100px' : '16px' }}>
						<div className="fire-notification-icon">🚨</div>
						<div className="fire-notification-content">
							<span className="fire-notification-title" style={{ color: '#ffffff' }}>ĐƯỜNG THOÁT HIỂM BỊ CHẶN HOÀN TOÀN!</span>
							<span className="fire-notification-desc" style={{ color: '#fecaca', fontWeight: 'bold' }}>
								Mọi lối thoát hiểm từ vị trí {escapeStartDoor} đã bị khói lửa cô lập. Hãy đóng chặt cửa, chèn khe bằng khăn ướt, và di chuyển ra cửa sổ/ban công để chờ cứu hộ!
							</span>
						</div>
					</div>
				)}
				<div className="manager-model-canvas" ref={canvasHostRef}>
					{isLoading ? <div className="manager-model-floating-status">Đang tải model 3D...</div> : null}
					{loadingError ? <div className="manager-model-floating-status manager-model-floating-error">{loadingError}</div> : null}
				</div>
			</div>

			{showCaption ? (
				<p className="manager-model-caption">
					Bạn có thể xoay, phóng to, hoặc chọn từng tầng hiển thị của tòa nhà.
				</p>
			) : null}
		</section>
	);
}

export default BuildingModelViewer;
