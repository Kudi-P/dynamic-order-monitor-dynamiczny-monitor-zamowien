export type OrderStatus = 'completed' | 'overdue' | 'in_progress' | 'due_soon';

export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface DriveFileAttachment {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  size?: number;
  modifiedTime?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  description: string;
  customerName: string;
  customerDetails?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isCompleted: boolean;
  completedDate?: string;
  priority?: OrderPriority;
  amount?: number;
  quantity?: number;
  category?: string;
  notes?: string;
  driveAttachments?: DriveFileAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderGanttMetrics {
  status: OrderStatus;
  statusLabel: string;
  percentElapsed: number;       // 0 - 100%
  todayMarkerPercent: number;    // Where the dashed line sits relative to [startDate, endDate] (can be > 100% if overdue or < 0% if future)
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  isLate: boolean;
  isCompleted: boolean;
  statusText: string;
}

export type ViewMode = 'table' | 'gantt' | 'cards';

export type FilterStatus = 'all' | 'in_progress' | 'overdue' | 'completed' | 'due_soon';

export type SortField = 'endDate' | 'startDate' | 'orderNumber' | 'customerName' | 'status' | 'amount';
export type SortDirection = 'asc' | 'desc';
