import { Order, OrderGanttMetrics, OrderStatus } from '../types';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function formatDateString(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = parseDate(dateStr);
    return d.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = parseDate(dateStr);
    return d.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

export function getDaysDifference(d1: string | Date, d2: string | Date): number {
  const date1 = typeof d1 === 'string' ? parseDate(d1) : d1;
  const date2 = typeof d2 === 'string' ? parseDate(d2) : d2;
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function pluralizeDays(count: number): string {
  const abs = Math.abs(count);
  if (abs === 1) return '1 dzień';
  return `${abs} dni`;
}

/**
 * Implements the exact Business Logic Rules:
 * Rule 1: If isCompleted is true -> Green ("completed")
 * Rule 2: If !isCompleted AND Today > End Date -> Red ("overdue")
 * Rule 3: If !isCompleted AND Today <= End Date -> Neutral/On Track ("in_progress" / "due_soon")
 */
export function calculateOrderMetrics(order: Order, todayStr: string): OrderGanttMetrics {
  const { startDate, endDate, isCompleted } = order;
  const daysTotal = Math.max(1, getDaysDifference(startDate, endDate));
  const daysElapsed = getDaysDifference(startDate, todayStr);
  const daysRemaining = getDaysDifference(todayStr, endDate);

  // Today marker percent within order timeline
  let todayMarkerPercent = 0;
  if (daysTotal > 0) {
    todayMarkerPercent = (daysElapsed / daysTotal) * 100;
  }

  // Clamped percent elapsed for the visual progress bar fill (0 to 100)
  const percentElapsed = Math.min(100, Math.max(0, todayMarkerPercent));

  let status: OrderStatus = 'in_progress';
  let statusLabel = 'W toku';
  let statusText = daysRemaining === 1 ? 'Pozostał 1 dzień' : `Pozostało ${pluralizeDays(daysRemaining)}`;
  const isLate = !isCompleted && daysRemaining < 0;

  // RULE 1: Complete is checked -> Green
  if (isCompleted) {
    status = 'completed';
    statusLabel = 'Zakończone';
    statusText = order.completedDate ? `Ukończono ${formatShortDate(order.completedDate)}` : 'Zakończone';
  } 
  // RULE 2: Complete is NOT checked AND Today > End Date -> Red
  else if (isLate) {
    status = 'overdue';
    const overdueDays = Math.abs(daysRemaining);
    statusLabel = 'Po terminie';
    statusText = `${pluralizeDays(overdueDays)} po terminie`;
  } 
  // RULE 3: Complete is NOT checked AND Today <= End Date -> Neutral / On Track
  else {
    if (daysRemaining === 0) {
      status = 'due_soon';
      statusLabel = 'Termin dzisiaj';
      statusText = 'Termin upływa dzisiaj';
    } else if (daysRemaining === 1) {
      status = 'due_soon';
      statusLabel = 'Termin jutro';
      statusText = 'Termin jutro (1 dzień)';
    } else if (daysRemaining <= 2) {
      status = 'due_soon';
      statusLabel = 'Termin wkrótce';
      statusText = `Zostały 2 dni`;
    } else {
      status = 'in_progress';
      statusLabel = 'W toku';
      statusText = `Pozostało ${pluralizeDays(daysRemaining)}`;
    }
  }

  return {
    status,
    statusLabel,
    percentElapsed,
    todayMarkerPercent,
    daysTotal,
    daysElapsed,
    daysRemaining,
    isLate,
    isCompleted,
    statusText,
  };
}

export const SAMPLE_ORDERS: Order[] = [
  {
    id: 'ord-1',
    orderNumber: 'ZAM-2026/088',
    description: 'Precyzyjne uchwyty aluminiowe obrabiane CNC (Partia 500 szt.)',
    customerName: 'AeroDynamics Lab',
    customerDetails: 'kontakt@aerodynamicslab.pl • Oddział Warszawa',
    startDate: '2026-08-01',
    endDate: '2026-08-15',
    isCompleted: true,
    completedDate: '2026-08-14',
    priority: 'high',
    amount: 14850,
    quantity: 500,
    category: 'Obróbka skrawaniem',
    notes: 'Przeszło kontrolę jakości ISO-9001. Przesyłka kurierska ekspresowa odebrana przez klienta.',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-14T15:30:00Z',
  },
  {
    id: 'ord-2',
    orderNumber: 'ZAM-2026/092',
    description: 'Obudowy czujników przemysłowych i montaż płytek PCB',
    customerName: 'VoltEdge Robotics',
    customerDetails: 'zaopatrzenie@voltedge.pl • Poznań',
    startDate: '2026-08-05',
    endDate: '2026-08-18',
    isCompleted: false,
    priority: 'urgent',
    amount: 22400,
    quantity: 120,
    category: 'Elektronika',
    notes: 'Oczekiwanie na dostawę komponentów scalonych od dostawcy. Wymaga natychmiastowej reakcji.',
    createdAt: '2026-08-05T09:15:00Z',
    updatedAt: '2026-08-18T10:00:00Z',
  },
  {
    id: 'ord-3',
    orderNumber: 'ZAM-2026/095',
    description: 'Niestandardowe kołnierze ze stali nierdzewnej i złączki wysokociśnieniowe',
    customerName: 'Apex Hydro Systems',
    customerDetails: 'm.wisniewski@apexhydro.pl • Kraków',
    startDate: '2026-08-10',
    endDate: '2026-08-22',
    isCompleted: false,
    priority: 'high',
    amount: 9800,
    quantity: 350,
    category: 'Spawalnictwo',
    notes: 'Końcowy etap polerowania powierzchni. Zaplanowano pakowanie na jutro rano.',
    createdAt: '2026-08-10T11:00:00Z',
    updatedAt: '2026-08-20T14:20:00Z',
  },
  {
    id: 'ord-4',
    orderNumber: 'ZAM-2026/101',
    description: 'Przekładnie planetarne o wysokim momencie obrotowym (Przełożenie 1:45)',
    customerName: 'RoboMotion Tech',
    customerDetails: 'inzynieria@robomotion.pl • Dąbrowa Górnicza',
    startDate: '2026-08-14',
    endDate: '2026-08-28',
    isCompleted: false,
    priority: 'medium',
    amount: 31200,
    quantity: 40,
    category: 'Montaż maszyn',
    notes: 'Hartowanie zębów przekładni ukończone. Trwają testy obciążeniowe na hamowni.',
    createdAt: '2026-08-14T08:30:00Z',
    updatedAt: '2026-08-21T09:00:00Z',
  },
  {
    id: 'ord-5',
    orderNumber: 'ZAM-2026/104',
    description: 'Lekkie panele nadwozia z kompozytów węglowych (Partia A)',
    customerName: 'Nexus E-Motors',
    customerDetails: 'dostawy@nexuselectric.pl • Wrocław',
    startDate: '2026-08-16',
    endDate: '2026-09-02',
    isCompleted: false,
    priority: 'high',
    amount: 48500,
    quantity: 25,
    category: 'Kompozyty',
    notes: 'Cykl wygrzewania w autoklawie w toku. Formy wzorcowe skalibrowane.',
    createdAt: '2026-08-16T13:45:00Z',
    updatedAt: '2026-08-21T07:00:00Z',
  },
  {
    id: 'ord-6',
    orderNumber: 'ZAM-2026/108',
    description: 'Grawerowane laserowo panele czołowe z pleksi i ramki sterujące',
    customerName: 'Luminary Systems',
    customerDetails: 'biuro@luminarysystems.pl • Gdańsk',
    startDate: '2026-08-08',
    endDate: '2026-08-19',
    isCompleted: true,
    completedDate: '2026-08-18',
    priority: 'low',
    amount: 5400,
    quantity: 800,
    category: 'Wykończenie',
    notes: 'Zapakowano i wysłano listem przewozowym DPD #8821940. Klient potwierdził dostawę.',
    createdAt: '2026-08-08T10:00:00Z',
    updatedAt: '2026-08-18T16:00:00Z',
  },
  {
    id: 'ord-7',
    orderNumber: 'ZAM-2026/112',
    description: 'Uszczelnienia siłowników hydraulicznych i zestawy zaworów przemysłowych',
    customerName: 'TerraForge Przemysł Ciężki',
    customerDetails: 'k.kowalczyk@terraforge.pl • Katowice',
    startDate: '2026-08-02',
    endDate: '2026-08-16',
    isCompleted: false,
    priority: 'urgent',
    amount: 17300,
    quantity: 600,
    category: 'Hydraulika',
    notes: '5 dni po terminie. Zamówienie na ścieżce krytycznej do remontu u klienta.',
    createdAt: '2026-08-02T08:00:00Z',
    updatedAt: '2026-08-16T18:00:00Z',
  },
  {
    id: 'ord-8',
    orderNumber: 'ZAM-2026/115',
    description: 'Niestandardowe radiatory aluminiowe anodowane (Czarny mat)',
    customerName: 'ThermalTech Solutions',
    customerDetails: 'p.nowak@thermaltech.pl • Łódź',
    startDate: '2026-08-18',
    endDate: '2026-08-25',
    isCompleted: false,
    priority: 'medium',
    amount: 11200,
    quantity: 1500,
    category: 'Wykończenie',
    notes: 'Kąpiel anodująca w toku. Kontrola grubości powłoki zaplanowana na piątek.',
    createdAt: '2026-08-18T09:00:00Z',
    updatedAt: '2026-08-21T08:00:00Z',
  },
];

export function exportOrdersToCsv(orders: Order[]): string {
  const headers = [
    'Numer zamówienia',
    'Opis',
    'Nazwa klienta',
    'Dane klienta',
    'Data rozpoczęcia',
    'Termin',
    'Czy ukończone',
    'Data ukończenia',
    'Priorytet',
    'Wartość',
    'Ilość',
    'Kategoria',
    'Uwagi',
  ];

  const rows = orders.map((o) => [
    `"${(o.orderNumber || '').replace(/"/g, '""')}"`,
    `"${(o.description || '').replace(/"/g, '""')}"`,
    `"${(o.customerName || '').replace(/"/g, '""')}"`,
    `"${(o.customerDetails || '').replace(/"/g, '""')}"`,
    `"${o.startDate || ''}"`,
    `"${o.endDate || ''}"`,
    o.isCompleted ? 'TAK' : 'NIE',
    `"${o.completedDate || ''}"`,
    `"${o.priority || 'medium'}"`,
    o.amount ?? 0,
    o.quantity ?? 1,
    `"${(o.category || '').replace(/"/g, '""')}"`,
    `"${(o.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function parseCsvToOrders(csvText: string): Partial<Order>[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const results: Partial<Order>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV row parser handling quotes
    const values: string[] = [];
    let insideQuotes = false;
    let currentValue = '';

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        if (insideQuotes && line[c + 1] === '"') {
          currentValue += '"';
          c++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    if (values.length >= 6) {
      const [
        orderNumber,
        description,
        customerName,
        customerDetails,
        startDate,
        endDate,
        isCompletedRaw,
        completedDate,
        priority,
        amount,
        quantity,
        category,
        notes,
      ] = values;

      const isCompleted = isCompletedRaw
        ? ['true', '1', 'tak', 'yes'].includes(isCompletedRaw.toLowerCase())
        : false;

      results.push({
        id: 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        orderNumber: orderNumber || `ZAM-${Date.now().toString().slice(-4)}`,
        description: description || 'Nowe zaimportowane zamówienie',
        customerName: customerName || 'Klient',
        customerDetails: customerDetails || '',
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        isCompleted,
        completedDate: isCompleted ? completedDate || new Date().toISOString().split('T')[0] : undefined,
        priority: (['low', 'medium', 'high', 'urgent', 'niski', 'średni', 'wysoki', 'pilny'].includes((priority || '').toLowerCase())
          ? (priority.toLowerCase() === 'niski' ? 'low' : priority.toLowerCase() === 'średni' ? 'medium' : priority.toLowerCase() === 'wysoki' ? 'high' : priority.toLowerCase() === 'pilny' ? 'urgent' : priority.toLowerCase())
          : 'medium') as Order['priority'],
        amount: Number(amount) || 0,
        quantity: Number(quantity) || 1,
        category: category || 'Ogólne',
        notes: notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return results;
}
