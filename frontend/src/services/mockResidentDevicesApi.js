import { getManagerDevices } from './mockManagerDevicesApi.js';

function mapDbDeviceToResident(device) {
  // Trích xuất chỉ số từ glbNodeName hoặc id để sinh số phòng ngẫu nhiên nhưng nhất quán
  const nodeIndexStr = device.glbNodeName?.match(/\d+/)?.[0] || device.id?.match(/\d+$/)?.[0] || '01';
  const floorNum = device.floor?.match(/\d+/)?.[0] || 'G';
  const room = floorNum === 'G' ? 'Sảnh trệt' : `Phòng ${floorNum}${nodeIndexStr.padStart(2, '0')}`;
  
  // Lối thoát gần nhất và khoảng cách
  const nearestExit = floorNum === 'G' ? 'Cửa sảnh chính' : `Cửa thoát hiểm E${floorNum}`;
  // Sinh khoảng cách ngẫu nhiên nhưng nhất quán theo tên node để tránh thay đổi liên tục khi re-render
  const seed = device.id ? device.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 10;
  const distanceToResident = (seed % 20) + 5; // 5m - 25m

  // Trạng thái sử dụng và lưu ý an toàn dựa theo loại thiết bị
  const isCabin = device.type?.toLowerCase().includes('tủ');
  const isCo2 = device.type?.toLowerCase().includes('co2') || device.model?.toLowerCase().includes('co2') || device.glbNodeName?.toLowerCase().includes('co2');
  
  let usageScope = 'Thiết bị cứu hỏa khẩn cấp';
  let caution = 'Chú ý an toàn khi sử dụng.';
  let instructionSteps = ['Sử dụng theo hướng dẫn trên nhãn thiết bị.'];

  if (isCabin) {
    usageScope = 'Tủ chứa thiết bị chữa cháy gồm vòi phun, bình bọt cứu hỏa';
    caution = 'Đảm bảo lối tiếp cận tủ không bị che khuất.';
    instructionSteps = [
      'Mở cửa tủ chữa cháy.',
      'Kéo cuộn vòi cứu hỏa ra ngoài.',
      'Lắp lăng phun vào đầu vòi, vặn chặt van nước để dập lửa.'
    ];
  } else if (isCo2) {
    usageScope = 'Đám cháy thiết bị điện hoặc tủ điện nhỏ';
    caution = 'Không cầm trực tiếp vào loa phun kim loại khi đang xả CO2.';
    instructionSteps = [
      'Rút chốt an toàn trên thân bình.',
      'Đứng xuôi chiều gió, hướng loa phun vào gốc lửa.',
      'Bóp cò và quét ngang đều tay từ gần đến xa.'
    ];
  } else {
    // Bình bột
    usageScope = 'Đám cháy chất rắn, chất lỏng dễ cháy quy mô nhỏ';
    caution = 'Sau khi xịt cần quan sát hiện tượng cháy bùng trở lại.';
    instructionSteps = [
      'Lắc nhẹ bình 2 đến 3 lần trước khi sử dụng.',
      'Rút chốt, giữ vòi hướng vào chân đám cháy.',
      'Bóp cò dứt khoát và quét theo hình rẻ quạt.'
    ];
  }

  // Map trạng thái để phù hợp với các CSS class của Resident (.status-safe, .status-warning, .status-danger)
  let residentStatus = 'safe';
  if (device.status === 'danger') {
    residentStatus = 'danger';
  } else if (device.status === 'warning' || device.status === 'maintenance') {
    residentStatus = 'warning';
  }

  // Map label hiển thị trạng thái
  let residentStatusLabel = device.statusLabel;
  if (!residentStatusLabel) {
    if (residentStatus === 'safe') residentStatusLabel = 'Hoạt động tốt';
    else if (residentStatus === 'warning') residentStatusLabel = 'Bảo trì';
    else residentStatusLabel = 'Hỏng tín hiệu';
  } else if (device.status === 'active') {
    residentStatusLabel = 'Hoạt động tốt'; // Chuyển từ 'Hoạt động tốt' (Manager)
  }

  return {
    ...device,
    room,
    nearestExit,
    distanceToResident,
    usageScope,
    caution,
    instructionSteps,
    status: residentStatus,
    statusLabel: residentStatusLabel
  };
}

export async function fetchResidentDevices() {
  const devices = await getManagerDevices();
  return devices.map(mapDbDeviceToResident);
}
