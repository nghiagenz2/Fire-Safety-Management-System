import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_URL = '/model/BconCity.glb';
const FLOOR_27_IDS = new Set(['Tang 27', 'floor_27']);
const FLOOR_27_HIDDEN_MESH_NAMES = new Set(['San_Vien_Ngoai.025']);
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
			const isSelectedFloorMesh = child.userData.floorId === selectedId;
			const isHiddenFloor27Ceiling =
				isFloor27Selected(selectedId) &&
				isHiddenWhenViewingFloor27(child);

			child.visible = isSelectedFloorMesh && !isHiddenFloor27Ceiling;
		}
	});
}

function fitCameraToObject(camera, controls, object) {
	const box = new THREE.Box3().setFromObject(object);
	const size = box.getSize(new THREE.Vector3());
	const center = box.getCenter(new THREE.Vector3());
	const maxDim = Math.max(size.x, size.y, size.z);
	const fov = (camera.fov * Math.PI) / 180;
	let cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
	cameraDistance *= 1.35;

	camera.position.set(center.x + cameraDistance, center.y + cameraDistance * 0.5, center.z + cameraDistance);
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
	scene.background = new THREE.Color('#111827');

	const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);

	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.shadowMap.enabled = false;

	const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
	const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
	directionalLight.position.set(12, 18, 10);
	directionalLight.castShadow = false;
	const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.0);
	rimLight.position.set(-10, 8, -12);
	scene.add(ambientLight, directionalLight, rimLight);

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

function BuildingModelViewer({
	className = '',
	showHeader = true,
	showCaption = true,
	title = 'Mô hình 3D tòa nhà',
	ariaLabel = 'Mô hình 3D tòa nhà',
	highlightExits = false,
	selectedFloorId: propSelectedFloorId,
	onDoorsLoaded,

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
	const [internalFloorId, setInternalFloorId] = useState('all');

	const [showFireNotification, setShowFireNotification] = useState(false);
	const prevSimulationActiveRef = useRef(false);

	// Auto-navigate to fire floor once on simulation start, and manage warning notification
	useEffect(() => {
		if (simulationActive) {
			setShowFireNotification(true);
			if (!prevSimulationActiveRef.current && syncSelectedFloorId && !isSimulationControlled) {
				setInternalFloorId(syncSelectedFloorId);
			}
		} else {
			setShowFireNotification(false);
		}
		prevSimulationActiveRef.current = simulationActive;
	}, [simulationActive, syncSelectedFloorId, isSimulationControlled]);

	const selectedFloorId = propSelectedFloorId !== undefined
		? propSelectedFloorId
		: internalFloorId;

	const setSelectedFloorId = propSelectedFloorId !== undefined ? () => { } : setInternalFloorId;
	const [modelSummary, setModelSummary] = useState(modelCache.summary || { name: MODEL_NAME, meshCount: 0 });

	// Sync simulation status in real-time using EventSource
	useEffect(() => {
		if (isSimulationControlled) {
			return undefined;
		}

		let eventSource = null;
		let reconnectTimeout = null;
		
		const connectSSE = () => {
			eventSource = new EventSource('http://localhost:5000/api/incidents/simulation/stream');
			
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
							floorId: child.userData.floorId
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
							floorId: child.userData.floorId
						};

						// Set initial visibility based on selectedFloorId
						const markerVisible = (selectedFloorId === 'all' || child.userData.floorId === selectedFloorId);
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
						marker.visible = (marker.userData.floorId === selectedFloorId);
					}
				}
			});

			// Toggle visibility of active fire meshes based on the selected floor
			activeFiresRef.current.forEach((fire) => {
				if (fire.mesh && fire.mesh.userData && fire.mesh.userData.floorId) {
					if (selectedFloorId === 'all') {
						fire.mesh.visible = true;
					} else {
						fire.mesh.visible = (fire.mesh.userData.floorId === selectedFloorId);
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
				exitDoorsRef.current.forEach((door) => {
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
						if (door.userData.isNearFire) {
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
				markersRef.current.forEach((marker) => {
					if (!marker.visible) return;
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

						if (marker.userData.isNearFire) {
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
						<h2 className="typo-h2 manager-title">{title}</h2>
					</div>
					<span className="manager-model-badge">{floorNodes.length > 0 ? `${floorNodes.length} tầng` : 'GLB'}</span>
				</div>
			) : null}

			<div className="manager-model-controls">
				<div className="manager-floor-dropdown-wrap">
					<label htmlFor="floor-select" className="typo-label text-secondary">Chọn tầng hiển thị</label>
					<select
						id="floor-select"
						className="manager-filter-select manager-floor-select"
						value={selectedFloorId}
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
							{internalFloorId !== syncSelectedFloorId && (
								<button 
									className="fire-notification-btn view-btn"
									onClick={() => setInternalFloorId(syncSelectedFloorId)}
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
