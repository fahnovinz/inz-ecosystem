// Static layout of VRAX World.
// Units are metres. +x points east, +z points south, y is up.
// Traffic drives on the left, as it does in Indonesia.

export const HALF_W = 74;
export const HALF_D = 46;
export const ROAD_HALF = 3.5;
export const SIDEWALK = 2;
export const LANE_OFFSET = 1.75;
export const VX = [-50, -24, 24, 50];
export const HZ = [-25, 0, 25];
export const RIVER_HALF = 7;
export const RIVERSIDE_X = 24;
export const BRIDGE_Z = { north: -25, south: 25 };

// River level is measured in metres relative to normal.
export const WATER_BASE = -2.0;
export const RIVER_MIN = -1;
export const RIVER_MAX = 2.5;
export const BOAT_CLEARANCE = 0.6; // above this boats no longer fit under the bridges
export const BOAT_AGROUND = -0.7; // below this boats touch the riverbed
export const FLOOD_STRIPS = 1.8; // riverside park, parking, pier and warung go under
export const FLOOD_ROADS = 2.2; // riverside roads and bridge approaches go under

export const COLUMNS = { W2: [-74, -53.5], W1: [-46.5, -27.5], E1: [27.5, 46.5], E2: [53.5, 74] };
export const ROWS = { N2: [-46, -28.5], N1: [-21.5, -3.5], S1: [3.5, 21.5], S2: [28.5, 46] };

// Land between the riverside roads and the river.
export const STRIPS = [
  { id: 'garden-nw', kind: 'garden', x0: -20.5, x1: -7, z0: -46, z1: -28.5 },
  { id: 'park', kind: 'park', x0: -20.5, x1: -7, z0: -21.5, z1: 21.5 },
  { id: 'pier', kind: 'pier', x0: -20.5, x1: -7, z0: 28.5, z1: 46 },
  { id: 'garden-ne', kind: 'garden', x0: 7, x1: 20.5, z0: -46, z1: -28.5 },
  { id: 'parking', kind: 'parking', x0: 7, x1: 20.5, z0: -21.5, z1: 21.5 },
  { id: 'warung', kind: 'warung', x0: 7, x1: 20.5, z0: 28.5, z1: 46 },
];

export const PENDOPO = { x: -13.75, z: 0, half: 3.2 };
export const PARKING_ENTRY_Z = -8;

export const WALL = {
  cream: 0xefe4cc, sand: 0xe3d0a8, white: 0xf1efe9, stone: 0xe4ddcd, rose: 0xe8b9a9,
  peach: 0xf0c49c, mint: 0xc3dbc4, sky: 0xbcd5e2, butter: 0xf1dc93, teal: 0x93c3bf,
  lilac: 0xcfc2e0, grey: 0xc9cdd3, brick: 0xb6624b, redbrick: 0xc0533e, slateblue: 0x9fb2c8,
  charcoal: 0x4a4f5a,
};
export const ROOF = {
  terracotta: 0xc4623f, red: 0xae4636, slate: 0x5b6470, dark: 0x3d4249,
  green: 0x4f7a5e, zinc: 0xa9afb5, blue: 0x4b6e8e,
};
export const FACADES = ['peach', 'mint', 'butter', 'sky', 'rose', 'lilac', 'teal', 'cream'];

// Lot-local rectangles: r = [x0, z0, x1, z1] measured from the lot's north-west corner.
// face is the side with the front door. Lots are 17.5 m wide in W2/E2 and 15 m in W1/E1.
export const BUILDINGS = [
  // W2N2
  { id: 'school', block: 'W2N2', r: [1, 1, 12, 8], face: 's', kind: 'school', floors: 2, fh: 3.6, roof: 'hip', wall: 'cream', roofColor: 'terracotta', nameKey: 'b.school', features: ['flag', 'field'] },
  { id: 'rumah-kamboja', block: 'W2N2', r: [13.5, 1, 17, 6.5], face: 'e', kind: 'house', floors: 2, roof: 'gable', ridge: 'z', wall: 'peach', roofColor: 'red', name: 'Rumah Kamboja', residents: 5 },
  { id: 'rumah-dahlia', block: 'W2N2', r: [13.5, 8.5, 17, 13.5], face: 'e', kind: 'house', floors: 2, roof: 'hip', wall: 'mint', roofColor: 'slate', name: 'Rumah Dahlia', residents: 4 },
  // W1N2
  { id: 'police', block: 'W1N2', r: [1, 7, 9.5, 14], face: 's', kind: 'police', floors: 2, fh: 3.4, roof: 'flat', wall: 'white', roofColor: 'zinc', nameKey: 'b.police', features: ['flag', 'stripe'] },
  { id: 'rumah-melati', block: 'W1N2', r: [11, 8.5, 14.5, 14], face: 'e', kind: 'house', floors: 2, roof: 'gable', ridge: 'x', wall: 'butter', roofColor: 'terracotta', name: 'Rumah Melati', residents: 5 },
  { id: 'kost-kenanga', block: 'W1N2', r: [1, 0.8, 14, 5.5], face: 'w', kind: 'kost', floors: 3, roof: 'flat', wall: 'sky', roofColor: 'zinc', name: 'Kost Kenanga', residents: 14, features: ['tanks'] },
  // W2N1
  { id: 'apartemen-nusa', block: 'W2N1', r: [1, 1, 9.5, 13], face: 'n', kind: 'apartments', floors: 5, roof: 'flat', wall: 'grey', roofColor: 'zinc', name: 'Apartemen Nusa', residents: 24, features: ['balconies', 'tanks'] },
  { id: 'rumah-anggrek', block: 'W2N1', r: [11, 1, 17, 6], face: 'e', kind: 'house', floors: 2, roof: 'gable', ridge: 'z', wall: 'rose', roofColor: 'red', name: 'Rumah Anggrek', residents: 5 },
  { id: 'rumah-teratai', block: 'W2N1', r: [11, 8, 17, 13], face: 's', kind: 'house', floors: 2, roof: 'hip', wall: 'teal', roofColor: 'dark', name: 'Rumah Teratai', residents: 4 },
  // W1N1
  { id: 'market', block: 'W1N1', r: [2, 1.5, 13, 7], face: 's', kind: 'market', floors: 1, fh: 5.5, roof: 'gable', ridge: 'x', wall: 'sand', roofColor: 'terracotta', nameKey: 'b.market', features: ['awning', 'plaza'] },
  // W2S1
  { id: 'ruko-cendana', block: 'W2S1', r: [1, 1, 16.5, 6], face: 'n', kind: 'ruko', floors: 3, roof: 'flat', wall: 'peach', roofColor: 'zinc', name: 'Ruko Cendana', residents: 10, units: 5, features: ['awning', 'tanks'] },
  { id: 'wisma-anggrek', block: 'W2S1', r: [1, 8, 9, 13.5], face: 's', kind: 'apartments', floors: 4, roof: 'flat', wall: 'peach', roofColor: 'zinc', name: 'Wisma Anggrek', residents: 16, features: ['balconies'] },
  { id: 'rumah-seruni', block: 'W2S1', r: [11, 8, 17, 13.5], face: 'e', kind: 'house', floors: 2, roof: 'hip', wall: 'butter', roofColor: 'blue', name: 'Rumah Seruni', residents: 4 },
  // W1S1
  { id: 'bank', block: 'W1S1', r: [1, 1.5, 9.5, 9], face: 'e', kind: 'bank', floors: 2, fh: 4.2, roof: 'flat', wall: 'stone', roofColor: 'slate', nameKey: 'b.bank', features: ['portico'] },
  { id: 'cafe', block: 'W1S1', r: [11, 1.5, 14, 6], face: 'e', kind: 'cafe', floors: 1, fh: 3.4, roof: 'shed', ridge: 'x', wall: 'mint', roofColor: 'dark', name: 'Kopi Vrax', features: ['awning', 'sign'] },
  { id: 'ruko-mawar', block: 'W1S1', r: [1, 10, 14, 13.5], face: 's', kind: 'ruko', floors: 3, roof: 'flat', wall: 'rose', roofColor: 'zinc', name: 'Ruko Mawar', residents: 8, units: 4, features: ['awning', 'tanks'] },
  // W2S2
  { id: 'hospital', block: 'W2S2', r: [1, 1, 12, 10.5], face: 'n', kind: 'hospital', floors: 4, roof: 'flat', wall: 'white', roofColor: 'zinc', nameKey: 'b.hospital', features: ['helipad', 'redcross'] },
  { id: 'rumah-flamboyan', block: 'W2S2', r: [13.5, 1, 17, 6.5], face: 'e', kind: 'house', floors: 2, roof: 'gable', ridge: 'z', wall: 'peach', roofColor: 'terracotta', name: 'Rumah Flamboyan', residents: 5 },
  { id: 'rumah-bougenville', block: 'W2S2', r: [13.5, 8.5, 17, 13.5], face: 'e', kind: 'house', floors: 2, roof: 'hip', wall: 'lilac', roofColor: 'slate', name: 'Rumah Bougenville', residents: 4 },
  // W1S2
  { id: 'deret-kenari', block: 'W1S2', r: [1, 1, 14, 6.5], face: 'n', kind: 'rowhouses', floors: 3, roof: 'gable', ridge: 'z', wall: 'butter', roofColor: 'red', name: 'Deret Kenari', residents: 14, units: 4 },
  { id: 'rumah-jati', block: 'W1S2', r: [1, 8.5, 6.5, 13.8], face: 'w', kind: 'house', floors: 2, roof: 'gable', ridge: 'x', wall: 'sand', roofColor: 'red', name: 'Rumah Jati', residents: 5 },
  { id: 'rumah-mahoni', block: 'W1S2', r: [8.5, 8.5, 14, 13.8], face: 'e', kind: 'house', floors: 2, roof: 'hip', wall: 'sky', roofColor: 'dark', name: 'Rumah Mahoni', residents: 4 },
  // E1N2
  { id: 'fire-station', block: 'E1N2', r: [1, 7, 12, 14], face: 's', kind: 'fire', floors: 2, fh: 3.8, roof: 'flat', wall: 'redbrick', roofColor: 'dark', nameKey: 'b.fire', features: ['garage', 'hosetower'] },
  { id: 'rumah-kemuning', block: 'E1N2', r: [1, 0.8, 6.5, 5.5], face: 'w', kind: 'house', floors: 2, roof: 'gable', ridge: 'x', wall: 'butter', roofColor: 'terracotta', name: 'Rumah Kemuning', residents: 5 },
  { id: 'rumah-cempaka', block: 'E1N2', r: [8.5, 0.8, 14, 5.5], face: 'e', kind: 'house', floors: 2, roof: 'hip', wall: 'rose', roofColor: 'slate', name: 'Rumah Cempaka', residents: 4 },
  // E2N2
  { id: 'apartemen-samudra', block: 'E2N2', r: [1, 1, 10, 13.5], face: 'w', kind: 'apartments', floors: 6, roof: 'flat', wall: 'sky', roofColor: 'zinc', name: 'Apartemen Samudra', residents: 30, features: ['balconies', 'tanks'] },
  { id: 'rumah-pandan', block: 'E2N2', r: [11.5, 8, 17, 13.5], face: 's', kind: 'house', floors: 2, roof: 'gable', ridge: 'z', wall: 'mint', roofColor: 'red', name: 'Rumah Pandan', residents: 5 },
  { id: 'rumah-nipah', block: 'E2N2', r: [11.5, 1, 17, 6], face: 's', kind: 'house', floors: 2, roof: 'hip', wall: 'cream', roofColor: 'blue', name: 'Rumah Nipah', residents: 4 },
  // E1N1
  { id: 'vrax-tower', block: 'E1N1', r: [4, 3, 11, 10], face: 's', kind: 'tower', floors: 13, fh: 3.2, roof: 'crown', wall: 'slateblue', roofColor: 'dark', nameKey: 'b.tower', features: ['plaza'] },
  // E2N1
  { id: 'hotel', block: 'E2N1', r: [1, 1, 9, 13], face: 'w', kind: 'hotel', floors: 7, roof: 'flat', wall: 'peach', roofColor: 'zinc', name: 'Hotel Nirwana', features: ['sign', 'balconies'] },
  { id: 'kantor-arunika', block: 'E2N1', r: [10.5, 1, 17, 6.3], face: 'n', kind: 'office', floors: 5, roof: 'flat', wall: 'slateblue', roofColor: 'zinc', name: 'Kantor Arunika' },
  { id: 'kantor-lazuardi', block: 'E2N1', r: [10.5, 7.8, 17, 13], face: 's', kind: 'office', floors: 4, roof: 'flat', wall: 'sand', roofColor: 'zinc', name: 'Kantor Lazuardi' },
  // E1S1
  { id: 'cinema', block: 'E1S1', r: [1, 1, 10, 8.5], face: 'w', kind: 'cinema', floors: 2, fh: 4.5, roof: 'flat', wall: 'charcoal', roofColor: 'dark', nameKey: 'b.cinema', features: ['marquee'] },
  { id: 'toko-buku', block: 'E1S1', r: [11.5, 1, 14, 6.5], face: 'e', kind: 'shop', floors: 2, roof: 'gable', ridge: 'z', wall: 'butter', roofColor: 'terracotta', name: 'Toko Buku Aksara' },
  { id: 'ruko-kenari', block: 'E1S1', r: [1, 10, 14, 13.5], face: 's', kind: 'ruko', floors: 2, roof: 'flat', wall: 'mint', roofColor: 'zinc', name: 'Ruko Kenari', residents: 8, units: 4, features: ['awning'] },
  // E2S1
  { id: 'warehouse', block: 'E2S1', r: [1, 1, 11.5, 9], face: 'n', kind: 'warehouse', floors: 2, fh: 4, roof: 'sawtooth', ridge: 'x', wall: 'brick', roofColor: 'dark', nameKey: 'b.warehouse' },
  { id: 'bengkel', block: 'E2S1', r: [13, 1, 17, 7], face: 'n', kind: 'workshop', floors: 1, fh: 4, roof: 'shed', ridge: 'z', wall: 'grey', roofColor: 'blue', name: 'Bengkel Jaya' },
  { id: 'rumah-kelapa', block: 'E2S1', r: [1, 10.5, 8, 13.6], face: 's', kind: 'house', floors: 2, roof: 'gable', ridge: 'x', wall: 'peach', roofColor: 'red', name: 'Rumah Kelapa', residents: 5 },
  { id: 'rumah-pinang', block: 'E2S1', r: [9.5, 10.5, 17, 13.6], face: 's', kind: 'house', floors: 2, roof: 'hip', wall: 'mint', roofColor: 'slate', name: 'Rumah Pinang', residents: 4 },
  // E1S2
  { id: 'apartemen-pelangi', block: 'E1S2', r: [1, 1, 14, 8], face: 'n', kind: 'apartments', floors: 5, roof: 'flat', wall: 'butter', roofColor: 'zinc', name: 'Apartemen Pelangi', residents: 26, features: ['balconies', 'tanks'] },
  { id: 'rumah-asoka', block: 'E1S2', r: [1, 9.5, 6.5, 14], face: 'w', kind: 'house', floors: 2, roof: 'gable', ridge: 'x', wall: 'sky', roofColor: 'terracotta', name: 'Rumah Asoka', residents: 5 },
  { id: 'rumah-tanjung', block: 'E1S2', r: [8.5, 9.5, 14, 14], face: 'e', kind: 'house', floors: 2, roof: 'hip', wall: 'rose', roofColor: 'dark', name: 'Rumah Tanjung', residents: 4 },
  // E2S2
  { id: 'kost-mawar', block: 'E2S2', r: [1, 1, 8.5, 7], face: 'n', kind: 'kost', floors: 3, roof: 'flat', wall: 'peach', roofColor: 'zinc', name: 'Kost Mawar', residents: 12, features: ['tanks'] },
  { id: 'rumah-sawo', block: 'E2S2', r: [10, 1, 17, 6.5], face: 'n', kind: 'house', floors: 2, roof: 'gable', ridge: 'z', wall: 'cream', roofColor: 'red', name: 'Rumah Sawo', residents: 5 },
  { id: 'rumah-belimbing', block: 'E2S2', r: [1, 9, 8.5, 13.8], face: 'w', kind: 'house', floors: 2, roof: 'hip', wall: 'teal', roofColor: 'slate', name: 'Rumah Belimbing', residents: 4 },
  { id: 'rumah-rambutan', block: 'E2S2', r: [10, 9, 17, 13.8], face: 'n', kind: 'house', floors: 2, roof: 'gable', ridge: 'x', wall: 'sand', roofColor: 'terracotta', name: 'Rumah Rambutan', residents: 5 },
];

// Buildings people can visit, and why.
export const VISIT = {
  market: 'shop', ruko: 'shop', cafe: 'coffee', shop: 'shop', bank: 'bank',
  hospital: 'clinic', cinema: 'movie', tower: 'work', hotel: 'visit',
};
export const WORKPLACES = ['school', 'police', 'market', 'bank', 'cafe', 'ruko', 'hospital', 'fire', 'tower', 'hotel', 'office', 'cinema', 'shop', 'warehouse', 'workshop'];

// Labelled places. anchor is the label's 3D position; target is what "this" refers to.
export const LANDMARKS = [
  { id: 'vrax-tower', key: 'b.tower', building: 'vrax-tower' },
  { id: 'bank', key: 'b.bank', building: 'bank' },
  { id: 'park', key: 'lm.park', at: [-13.75, 3, -9] },
  { id: 'bridge-north', key: 'lm.bridgeNorth', at: [0, 3.5, -25] },
  { id: 'bridge-south', key: 'lm.bridgeSouth', at: [0, 3.5, 25] },
  { id: 'parking', key: 'lm.parking', at: [13.75, 2.5, -2] },
  { id: 'market', key: 'b.market', building: 'market' },
  { id: 'fire-station', key: 'b.fire', building: 'fire-station' },
  { id: 'police', key: 'b.police', building: 'police' },
  { id: 'warung', key: 'lm.warung', at: [13.75, 3, 37] },
  { id: 'school', key: 'b.school', building: 'school' },
  { id: 'warehouse', key: 'b.warehouse', building: 'warehouse' },
];

// Resident first names. One of them is the mayor's namesake.
export const NAMES = [
  'Sari', 'Budi', 'Dewi', 'Agus', 'Rina', 'Joko', 'Putri', 'Andi', 'Wulan', 'Rizky', 'Ayu', 'Fajar',
  'Nadia', 'Bayu', 'Intan', 'Dimas', 'Lestari', 'Hendra', 'Maya', 'Yusuf', 'Citra', 'Eko', 'Fitri',
  'Gilang', 'Kartika', 'Taufik', 'Indah', 'Rudi', 'Siti', 'Wahyu', 'Nur', 'Arief', 'Laras', 'Bima',
  'Anisa', 'Doni', 'Mega', 'Rangga', 'Tiara', 'Yoga', 'Dina', 'Hafiz', 'Kirana', 'Surya', 'Melati',
  'Adit', 'Nisa', 'Galih', 'Ratna', 'Teguh',
];
