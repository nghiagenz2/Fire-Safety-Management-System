const seed = [
  {
    id: 'EXIT-F1-MAIN',
    type: 'Cửa thoát hiểm',
    floor: 'Tầng 1',
    location: 'Tầng 1',
    room: 'Lối ra chính',
    connectedTo: 'Lối ra chính',
    status: 'available',
    statusLabel: 'Khả dụng',
    lastInspection: '2026-03-20',
    owner: 'Nguyễn Văn A',
    width: '1.4 m',
    clearHeight: '2.1 m',
    glbNodeName: 'Tang_1_Cua_Thoat_Chinh',
    glbNodeIndex: 101
  },
  {
    id: 'STAIRS-F1-F2',
    type: 'Thang bộ',
    floor: 'Tầng 1',
    location: 'Tầng 1',
    room: 'Tầng 2',
    connectedTo: 'Tầng 2',
    status: 'available',
    statusLabel: 'Khả dụng',
    lastInspection: '2026-03-18',
    owner: 'Nguyễn Văn A',
    width: '1.2 m',
    clearHeight: '2.0 m',
    glbNodeName: 'Tang_1_Thang_Bo_1',
    glbNodeIndex: 102
  },
  {
    id: 'EMERG-F2-001',
    type: 'Thang thoát hiểm',
    floor: 'Tầng 2',
    location: 'Tầng 2',
    room: 'Thang thoát hiểm ngoài',
    connectedTo: 'Thang thoát hiểm ngoài',
    status: 'available',
    statusLabel: 'Khả dụng',
    lastInspection: '2026-03-15',
    owner: 'Trần Văn B',
    width: '1.3 m',
    clearHeight: '2.1 m',
    glbNodeName: 'Tang_2_Thang_Thoat_Hiem',
    glbNodeIndex: 201
  },
  {
    id: 'EXIT-F3-SIDE',
    type: 'Cửa thoát hiểm',
    floor: 'Tầng 3',
    location: 'Tầng 3',
    room: 'Lối ra phụ',
    connectedTo: 'Lối ra phụ',
    status: 'inspection',
    statusLabel: 'Cần kiểm tra',
    lastInspection: '2026-02-25',
    owner: 'Lê Văn C',
    width: '1.1 m',
    clearHeight: '2.0 m',
    glbNodeName: 'Tang_3_Cua_Thoat_Phu',
    glbNodeIndex: 301
  },
  {
    id: 'STAIRS-F2-F3',
    type: 'Thang bộ',
    floor: 'Tầng 2',
    location: 'Tầng 2',
    room: 'Tầng 3',
    connectedTo: 'Tầng 3',
    status: 'available',
    statusLabel: 'Khả dụng',
    lastInspection: '2026-03-19',
    owner: 'Trần Văn B',
    width: '1.2 m',
    clearHeight: '2.0 m',
    glbNodeName: 'Tang_2_Thang_Bo_2',
    glbNodeIndex: 202
  },
  {
    id: 'EXIT-F1-BACK',
    type: 'Cửa thoát hiểm',
    floor: 'Tầng 1',
    location: 'Tầng 1',
    room: 'Lối ra sau',
    connectedTo: 'Lối ra sau',
    status: 'available',
    statusLabel: 'Khả dụng',
    lastInspection: '2026-03-21',
    owner: 'Nguyễn Văn A',
    width: '1.4 m',
    clearHeight: '2.1 m',
    glbNodeName: 'Tang_1_Cua_Thoat_Sau',
    glbNodeIndex: 103
  },
  {
    id: 'ELEVATOR-F1-F3',
    type: 'Thang máy dừng khẩn cấp',
    floor: 'Tầng 1',
    location: 'Tầng 1',
    room: 'Khu vực thang máy',
    connectedTo: 'Không sử dụng (chế độ khẩn cấp)',
    status: 'unavailable',
    statusLabel: 'Không khả dụng',
    lastInspection: '2026-03-10',
    owner: 'Kỹ thuật',
    width: '1.6 m',
    clearHeight: '2.3 m',
    glbNodeName: 'Tang_1_Thang_May_Khan_Cap',
    glbNodeIndex: 104
  }
];

// Automatically generate sample escapes for floors 4 to 27
for (let f = 4; f <= 27; f++) {
  seed.push({
    id: `STAIRS-F${f}-UP`,
    type: "Thang bộ thoát hiểm",
    floor: `Tầng ${f}`,
    location: `Tầng ${f}`,
    room: `Hành lang tầng ${f}`,
    status: f % 7 === 0 ? "inspection" : "available",
    statusLabel: f % 7 === 0 ? "Cần kiểm tra" : "Khả dụng",
    connectedTo: `Cầu thang bộ trục B`,
    lastInspection: `2026-04-${10 + (f % 15)}`,
    owner: f % 2 === 0 ? "Nguyễn Văn A" : "Trần Văn B"
  });
  seed.push({
    id: `EXIT-F${f}-A`,
    type: "Cửa thoát hiểm",
    floor: `Tầng ${f}`,
    location: `Tầng ${f}`,
    room: `Phòng kỹ thuật tầng ${f}`,
    status: "available",
    statusLabel: "Khả dụng",
    connectedTo: `Lối ra thoát hiểm hành lang`,
    lastInspection: `2026-04-${12 + (f % 15)}`,
    owner: f % 2 === 0 ? "Trần Văn B" : "Nguyễn Văn A"
  });
}

// Ground floor (Tầng trệt) escape data
seed.push({
  id: "EXIT-TRET-MAIN",
  type: "Cửa thoát hiểm chính",
  floor: "Tầng trệt",
  location: "Tầng trệt",
  room: "Sảnh chính",
  status: "available",
  statusLabel: "Khả dụng",
  connectedTo: "Lối ra ngoài tòa nhà",
  width: "2.4 m",
  clearHeight: "2.4 m",
  lastInspection: "2026-04-01",
  owner: "Nguyễn Văn A"
});
seed.push({
  id: "EXIT-TRET-SIDE",
  type: "Cửa thoát hiểm phụ",
  floor: "Tầng trệt",
  location: "Tầng trệt",
  room: "Lối vào phía sau",
  status: "available",
  statusLabel: "Khả dụng",
  connectedTo: "Lối thoát ra sân sau",
  width: "1.8 m",
  clearHeight: "2.2 m",
  lastInspection: "2026-04-05",
  owner: "Trần Văn B"
});
seed.push({
  id: "STAIRS-TRET-UP",
  type: "Thang bộ thoát hiểm",
  floor: "Tầng trệt",
  location: "Tầng trệt",
  room: "Hành lang tầng trệt",
  status: "available",
  statusLabel: "Khả dụng",
  connectedTo: "Cầu thang bộ trục A",
  lastInspection: "2026-04-03",
  owner: "Nguyễn Văn A"
});

module.exports = seed;