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
	buildingCenter: null,
};

const highlightMaterial = new THREE.MeshStandardMaterial({
	color: new THREE.Color('#10b981'), // Vibrant emerald green
	emissive: new THREE.Color('#047857'), // Glowing green
	roughness: 0.2,
	metalness: 0.8,
});


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

	const getFloorNum = (s) => {
		// After non-ascii stripping, "trệt" → "trt", "tret" stays "tret"
		if (s.includes('tret') || s.includes('trt')) return 0;
		const m = s.match(/\d+/);
		return m ? parseInt(m[0], 10) : null;
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
			floor.object.traverse((child) => {
				if (child.isMesh) {
					child.userData.floorId = floor.id;
				}
			});
		});

		// Đóng dấu null cho tất cả các mesh không thuộc tầng nào
		gltf.scene.traverse((child) => {
			if (child.isMesh && !child.userData.floorId) {
				child.userData.floorId = null;
			}
		});

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

/**
 * Positions camera to have a clear frontal view of a specific 3D node (escape door).
 * Uses the building center to determine the outward-facing direction so the camera
 * is always placed OUTSIDE the building relative to the door, looking directly at it.
 *
 * @param {THREE.Camera} camera
 * @param {OrbitControls} controls
 * @param {THREE.Object3D} object - the escape door node
 * @param {THREE.Vector3|null} buildingCenter - cached center of the whole building model
 */
function zoomToNode(camera, controls, object, buildingCenter) {
	console.log('zoomToNode called for object:', object.name);

	object.updateWorldMatrix(true, true);
	const box = new THREE.Box3().setFromObject(object);
	if (box.isEmpty()) {
		console.warn('zoomToNode: bounding box empty, falling back to world-matrix position.');
		// Use world position directly
		const worldPos = new THREE.Vector3();
		object.getWorldPosition(worldPos);
		box.setFromCenterAndSize(worldPos, new THREE.Vector3(1, 2.2, 0.2));
	}

	const size = box.getSize(new THREE.Vector3());
	const center = box.getCenter(new THREE.Vector3());
	const maxDim = Math.max(size.x, size.y, size.z);
	console.log('Object center:', center, 'size:', size);

	const fov = (camera.fov * Math.PI) / 180;
	let cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
	// Zoom in close enough to clearly see the door, but not too tight
	cameraDistance = Math.max(cameraDistance * 3.5, 8.0);

	// ── Determine outward-facing direction ──────────────────────────────────
	// The optimal camera position is on the OUTSIDE of the building relative
	// to this door, so we always see the door face-on.
	let outwardDir = new THREE.Vector3();

	if (buildingCenter) {
		// Vector from building center → door center on the XZ plane
		const xzOut = new THREE.Vector2(
			center.x - buildingCenter.x,
			center.z - buildingCenter.z,
		);
		if (xzOut.length() > 0.3) {
			xzOut.normalize();
			outwardDir.set(xzOut.x, 0, xzOut.y);
		}
	}

	if (outwardDir.lengthSq() < 0.01) {
		// Fallback: extract local Z axis from object's world matrix (faces outward for doors)
		const worldMat = new THREE.Matrix4();
		worldMat.copy(object.matrixWorld);
		outwardDir.setFromMatrixColumn(worldMat, 2); // local +Z
		outwardDir.y = 0;
		if (outwardDir.lengthSq() < 0.001) {
			// Last resort diagonal
			outwardDir.set(1, 0, 1).normalize();
		} else {
			outwardDir.normalize();
		}
	}

	// ── Position camera on the outward side, slightly elevated ────────────
	const elevationRatio = 0.35; // subtle upward tilt to show context
	const cameraPos = new THREE.Vector3(
		center.x + outwardDir.x * cameraDistance,
		center.y + cameraDistance * elevationRatio,
		center.z + outwardDir.z * cameraDistance,
	);

	camera.position.copy(cameraPos);
	camera.near = 0.05;
	camera.far = 1000;
	camera.updateProjectionMatrix();

	controls.target.copy(center);
	controls.update();
}

function fitCameraToVisibleMeshes(camera, controls, rootObject) {
	const visibleBox = new THREE.Box3();
	let hasVisibleMesh = false;

	rootObject.traverse((child) => {
		if (!child.isMesh || !child.visible) {
			return;
		}

		visibleBox.expandByObject(child);
		hasVisibleMesh = true;
	});

	if (!hasVisibleMesh || visibleBox.isEmpty()) {
		fitCameraToObject(camera, controls, rootObject);
		return;
	}

	const size = visibleBox.getSize(new THREE.Vector3());
	const center = visibleBox.getCenter(new THREE.Vector3());
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
	scene.background = new THREE.Color('#eef2ff');

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
	gridHelper.material.transparent = true;
	gridHelper.material.opacity = 0.35;
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

function BuildingModelViewer({
	className = '',
	showHeader = true,
	showCaption = true,
	showFloorSelector = true,
	title = 'Mô hình 3D tòa nhà',
	ariaLabel = 'Mô hình 3D tòa nhà',
	selectedFloorId: selectedFloorIdProp,
	highlightedEscape,
	onSelectedFloorChange,
	onFloorsLoaded,
}) {
	const canvasHostRef = useRef(null);
	const gltfRef = useRef(null);
	const [isLoading, setIsLoading] = useState(!modelCache.gltf);
	const [loadingError, setLoadingError] = useState('');
	const [floorNodes, setFloorNodes] = useState(modelCache.floors || []);
	const [internalSelectedFloorId, setInternalSelectedFloorId] = useState('all');
	const [modelSummary, setModelSummary] = useState(modelCache.summary || { name: MODEL_NAME, meshCount: 0 });
	const selectedFloorId = selectedFloorIdProp ?? internalSelectedFloorId;

	function handleSelectedFloorChange(nextFloorId) {
		if (typeof onSelectedFloorChange === 'function') {
			onSelectedFloorChange(nextFloorId);
		}

		if (selectedFloorIdProp === undefined) {
			setInternalSelectedFloorId(nextFloorId);
		}
	}

	useEffect(() => {
		if (gltfRef.current) {
			applyFloorVisibility(gltfRef.current, selectedFloorId);

			// Avoid resetting camera if currently focusing a node on this floor
			const targetFloorId = highlightedEscape && (highlightedEscape.glbFloorId || floorLabelToModelFloorId(highlightedEscape.floor));
			const isFocusingNodeOnSelectedFloor = targetFloorId && matchFloorId(targetFloorId, selectedFloorId);

			if (!isFocusingNodeOnSelectedFloor) {
				fitCameraToVisibleMeshes(globalContext.camera, globalContext.controls, gltfRef.current.scene);
			}
			globalContext.needsRender = true;
		}
	}, [selectedFloorId, highlightedEscape]);

	useEffect(() => {
		if (!gltfRef.current) return;

		// Clear previous highlights
		gltfRef.current.scene.traverse((child) => {
			if (child.isMesh && child.userData.originalMaterial) {
				child.material = child.userData.originalMaterial;
				delete child.userData.originalMaterial;
			}
		});

		console.log("highlightedEscape effect triggered. Escape details:", highlightedEscape);
		if (!highlightedEscape) {
			globalContext.needsRender = true;
			return;
		}

		const { glbNodeName } = highlightedEscape;
		console.log("glbNodeName to find:", glbNodeName);
		if (!glbNodeName) {
			console.warn("highlightedEscape has no glbNodeName!");
			return;
		}

		const canonicalTarget = glbNodeName.toLowerCase().replace(/[^a-z0-9]/g, "");
		let targetNode = null;

		gltfRef.current.scene.traverse((child) => {
			if (child.name) {
				const canonicalChild = child.name.toLowerCase().replace(/[^a-z0-9]/g, "");
				if (canonicalChild === canonicalTarget) {
					targetNode = child;
				}
			}
		});

		if (!targetNode) {
			console.log("Exact canonical match not found. Trying partial canonical match...");
			gltfRef.current.scene.traverse((child) => {
				if (child.name) {
					const canonicalChild = child.name.toLowerCase().replace(/[^a-z0-9]/g, "");
					if (canonicalChild.includes(canonicalTarget) || canonicalTarget.includes(canonicalChild)) {
						targetNode = child;
					}
				}
			});
		}

		if (targetNode) {
			console.log("Found targetNode:", targetNode.name, targetNode);
			// Apply highlight material
			targetNode.traverse((child) => {
				if (child.isMesh) {
					if (!child.userData.originalMaterial) {
						child.userData.originalMaterial = child.material;
					}
					child.material = highlightMaterial;
				}
			});

		// Zoom to the target node using smart outward-facing camera angle
			zoomToNode(globalContext.camera, globalContext.controls, targetNode, modelCache.buildingCenter);
			globalContext.needsRender = true;
		} else {
			console.warn("Could not find targetNode in scene for name/canonicalTarget:", glbNodeName, canonicalTarget);
		}
	}, [highlightedEscape]);

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

		const animate = () => {
			if (disposed) {
				return;
			}
			try {
				const controlsUpdated = controls.update();
				if (controlsUpdated || ctx.needsRender) {
					if (renderer && scene && camera) {
						renderer.render(scene, camera);
					}
					ctx.needsRender = false;
				}
			} catch (err) {
				console.error('WebGL render loop error:', err);
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

					// Cache the building center for smart camera angle computation
					if (!modelCache.buildingCenter) {
						const buildingBox = new THREE.Box3().setFromObject(ctx.modelRoot);
						if (!buildingBox.isEmpty()) {
							modelCache.buildingCenter = buildingBox.getCenter(new THREE.Vector3());
							console.log('Building center cached:', modelCache.buildingCenter);
						}
					}

					fitCameraToObject(camera, controls, ctx.modelRoot);
					ctx.isModelInitialized = true;
				}

				applyFloorVisibility(gltf, selectedFloorId);
					fitCameraToVisibleMeshes(camera, controls, gltf.scene);

				setFloorNodes(modelCache.floors);
				if (typeof onFloorsLoaded === 'function' && modelCache.floors) {
					onFloorsLoaded(modelCache.floors.map((f) => ({ id: f.id, name: f.name })));
				}
				setModelSummary(modelCache.summary);

				handleResize();
				ctx.needsRender = true;
			} catch (error) {
				console.error(error);
				setLoadingError(`Không tải được model 3D. Kiểm tra lại file ${MODEL_NAME}.`);
			} finally {
				setIsLoading(false);
			}
		};

		if (modelCache.gltf && ctx.isModelInitialized) {
			gltfRef.current = modelCache.gltf;
			applyFloorVisibility(modelCache.gltf, selectedFloorId);
			fitCameraToVisibleMeshes(camera, controls, modelCache.gltf.scene);
			setFloorNodes(modelCache.floors);
			if (typeof onFloorsLoaded === 'function' && modelCache.floors) {
					onFloorsLoaded(modelCache.floors.map((f) => ({ id: f.id, name: f.name })));
			}
			setModelSummary(modelCache.summary);
			handleResize();
			ctx.needsRender = true;
			setIsLoading(false);
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

			{showFloorSelector ? (
				<div className="manager-model-controls">
					<div className="manager-floor-dropdown-wrap">
						<label htmlFor="floor-select" className="typo-label text-secondary">Chọn tầng hiển thị</label>
						<select
							id="floor-select"
							className="manager-filter-select manager-floor-select"
							value={selectedFloorId === 'all' ? 'all' : (floorNodes.find((fn) => matchFloorId(fn.id, selectedFloorId))?.id || selectedFloorId)}
							onChange={(e) => handleSelectedFloorChange(e.target.value)}
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

			<div className="manager-model-stage">
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
