export type PunchType = 'entry' | 'break_start' | 'break_end' | 'exit';

export interface TimePunch {
  id: string;
  userId: string;
  userName: string;
  type: PunchType;
  timestamp: string; // ISO
  deviceInfo: string;
  geolocation?: { lat: number; lng: number };
  hash: string; // Security hash
  isAdjustment?: boolean;
  adjustmentReason?: string;
  status: 'active' | 'rectified' | 'cancelled';
}

export interface TimeAdjustmentRequest {
  id: string;
  userId: string;
  userName: string;
  punchId?: string; // If rectifying existing
  requestedType: PunchType;
  requestedTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  managerComment?: string;
  createdAt: string;
}

export interface TimeSheet {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  status: 'open' | 'closed';
  signedByEmployee: boolean;
  signedAt?: string;
  totalHours: number;
  overtimeHours: number;
  balanceHours: number;
}

export const PUNCH_LABELS: Record<PunchType, { label: string; color: string }> = {
  entry: { label: 'Entrada', color: '#10b981' },
  break_start: { label: 'Início Intervalo', color: '#f59e0b' },
  break_end: { label: 'Retorno Intervalo', color: '#3b82f6' },
  exit: { label: 'Saída Final', color: '#ef4444' },
};

// Mock Data
export const mockPunches: TimePunch[] = [
  {
    id: 'p1', userId: 'u3', userName: 'Profa. Maria (Infantil)',
    type: 'entry', timestamp: '2026-05-04T08:00:00Z',
    deviceInfo: 'iPhone 13 - iOS 17.4', hash: 'sha256-xyz123',
    status: 'active'
  },
  {
    id: 'p2', userId: 'u3', userName: 'Profa. Maria (Infantil)',
    type: 'break_start', timestamp: '2026-05-04T12:00:00Z',
    deviceInfo: 'iPhone 13 - iOS 17.4', hash: 'sha256-abc456',
    status: 'active'
  }
];

export const mockAdjustments: TimeAdjustmentRequest[] = [
  {
    id: 'adj1', userId: 'u4', userName: 'Prof. João (Fundamental)',
    requestedType: 'exit', requestedTime: '2026-05-03T18:15:00Z',
    reason: 'Esqueci de bater o ponto na saída.',
    status: 'pending', createdAt: '2026-05-04T09:00:00Z'
  }
];
