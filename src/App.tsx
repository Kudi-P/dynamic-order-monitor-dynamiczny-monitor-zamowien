import React, { useState, useEffect, useMemo } from 'react';
import { Order, FilterStatus, ViewMode, SortField, SortDirection, DriveFileAttachment } from './types';
import { SAMPLE_ORDERS, calculateOrderMetrics, parseDate, getTodayDateString } from './utils/orderLogic';
import { MetricsHeader } from './components/MetricsHeader';
import { TodayDateController } from './components/TodayDateController';
import { OrderTable } from './components/OrderTable';
import { TimelineGlobalView } from './components/TimelineGlobalView';
import { OrderCardsView } from './components/OrderCardsView';
import { OrderModal } from './components/OrderModal';
import { OrderDetailsDrawer } from './components/OrderDetailsDrawer';
import { CsvImportExportModal } from './components/CsvImportExportModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { DriveFilePickerModal } from './components/DriveFilePickerModal';
import { ConfirmModal } from './components/ConfirmModal';
import { initAuth, googleSignIn, logoutGoogle } from './services/googleAuth';
import {
  testFirestoreConnection,
  initializeCloudDatabase,
  subscribeToOrders,
  saveOrderToCloud,
  deleteOrderFromCloud,
  bulkUploadOrdersToCloud,
  bulkDeleteOrdersFromCloud
} from './services/firestoreService';
import type { User } from 'firebase/auth';
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  CalendarRange,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  Sparkles,
  ShieldCheck,
  Cloud,
  Database,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

const STORAGE_KEY = 'dynamic_order_tracker_data_v1';

export default function App() {
  // Real dynamic current date from the browser / device
  const [systemRealDate, setSystemRealDate] = useState<string>(() => getTodayDateString());

  // Today reference date state (can be scrubbed/simulated to test Rule 2 & 3 triggers)
  const [todayStr, setTodayStr] = useState<string>(() => getTodayDateString());

  // Periodically check if day changed (e.g., past midnight)
  useEffect(() => {
    const timer = setInterval(() => {
      const current = getTodayDateString();
      setSystemRealDate(current);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Cloud Firestore Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'connecting' | 'synced' | 'saving' | 'error'>('connecting');
  const [isCloudReady, setIsCloudReady] = useState(false);

  // Google Drive & Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [drivePickerTargetOrder, setDrivePickerTargetOrder] = useState<Order | null>(null);

  // Orders State initialized from Cloud Firestore
  const [orders, setOrders] = useState<Order[]>([]);

  // Test connection & Subscribe to Cloud Firestore on boot
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const setupFirestore = async () => {
      try {
        setCloudSyncStatus('connecting');
        await testFirestoreConnection();
        await initializeCloudDatabase(SAMPLE_ORDERS);

        unsubscribeFirestore = subscribeToOrders(
          (cloudOrders) => {
            setOrders(cloudOrders);
            setCloudSyncStatus('synced');
            setIsCloudReady(true);
          },
          (err) => {
            console.error('Firestore listener error:', err);
            setCloudSyncStatus('error');
          }
        );
      } catch (err) {
        console.error('Firestore connection init error:', err);
        setCloudSyncStatus('error');
      }
    };

    setupFirestore();

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Błąd logowania Google: ${err.message}`);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await logoutGoogle();
      setCurrentUser(null);
      setAccessToken(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  // UI States
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('endDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Selection & Modal States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);
  const [drawerOrder, setDrawerOrder] = useState<Order | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Unique categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.category) set.add(o.category);
    });
    return Array.from(set);
  }, [orders]);

  // Toggle order completion (Rule 1 trigger) + Sync to Firestore
  const handleToggleComplete = async (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const nextCompleted = !targetOrder.isCompleted;
    const updatedOrder: Order = {
      ...targetOrder,
      isCompleted: nextCompleted,
      completedDate: nextCompleted ? todayStr : undefined,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic local update
    setOrders((prev) => prev.map((ord) => (ord.id === orderId ? updatedOrder : ord)));
    if (drawerOrder?.id === orderId) {
      setDrawerOrder(updatedOrder);
    }

    // Save directly to Cloud Firestore
    try {
      setCloudSyncStatus('saving');
      await saveOrderToCloud(updatedOrder);
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Błąd zapisu w chmurze:', err);
      setCloudSyncStatus('error');
    }
  };

  // Create, Update or Duplicate Order + Sync to Firestore
  const handleSaveOrder = async (orderData: Partial<Order>) => {
    setCloudSyncStatus('saving');
    try {
      if (editingOrder && !isDuplicateMode) {
        // Edit existing order
        const updated: Order = {
          ...editingOrder,
          ...orderData,
          updatedAt: new Date().toISOString(),
        } as Order;

        setOrders((prev) => prev.map((o) => (o.id === editingOrder.id ? updated : o)));
        if (drawerOrder?.id === editingOrder.id) {
          setDrawerOrder(updated);
        }
        await saveOrderToCloud(updated);
      } else {
        // New or Duplicated order
        const newOrder: Order = {
          id: 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          orderNumber: orderData.orderNumber || `ORD-2026-${Math.floor(100 + Math.random() * 900)}`,
          description: orderData.description || 'Nowe zamówienie',
          customerName: orderData.customerName || 'Klient',
          customerDetails: orderData.customerDetails || '',
          startDate: orderData.startDate || todayStr,
          endDate: orderData.endDate || todayStr,
          isCompleted: Boolean(orderData.isCompleted),
          completedDate: orderData.isCompleted ? todayStr : undefined,
          priority: orderData.priority || 'medium',
          amount: orderData.amount || 0,
          quantity: orderData.quantity || 1,
          category: orderData.category || 'Ogólne',
          notes: orderData.notes || '',
          driveAttachments: isDuplicateMode && editingOrder?.driveAttachments ? [...editingOrder.driveAttachments] : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setOrders((prev) => [newOrder, ...prev]);
        await saveOrderToCloud(newOrder);
      }
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Błąd zapisu do Firestore:', err);
      setCloudSyncStatus('error');
    }
    setEditingOrder(null);
    setIsDuplicateMode(false);
  };

  // Duplicate order action
  const handleDuplicateOrder = (order: Order) => {
    setEditingOrder(order);
    setIsDuplicateMode(true);
    setIsOrderModalOpen(true);
  };

  // Request deletion: opens in-app confirmation modal
  const handleDeleteOrder = (id: string) => {
    const target = orders.find((o) => o.id === id);
    if (target) {
      setOrderToDelete(target);
    }
  };

  // Perform confirmed deletion of single order
  const confirmDeleteSingleOrder = async () => {
    if (!orderToDelete) return;
    const id = orderToDelete.id;

    // Optimistic local update
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    if (drawerOrder?.id === id) {
      setDrawerOrder(null);
    }
    setOrderToDelete(null);

    try {
      setCloudSyncStatus('saving');
      await deleteOrderFromCloud(id);
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Błąd usuwania z Firestore:', err);
      setCloudSyncStatus('error');
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    const targetOrder = orders.find((o) => o.id === id);
    if (!targetOrder) return;

    const updatedOrder: Order = {
      ...targetOrder,
      notes,
      updatedAt: new Date().toISOString(),
    };

    setOrders((prev) => prev.map((o) => (o.id === id ? updatedOrder : o)));
    if (drawerOrder?.id === id) {
      setDrawerOrder(updatedOrder);
    }

    try {
      setCloudSyncStatus('saving');
      await saveOrderToCloud(updatedOrder);
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Błąd zapisu notatek:', err);
      setCloudSyncStatus('error');
    }
  };

  // Google Drive Attachment Handlers + Sync to Cloud
  const handleAttachDriveFiles = async (orderId: string, newAttachments: DriveFileAttachment[]) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const currentAtts = targetOrder.driveAttachments || [];
    const existingIds = new Set(currentAtts.map((a) => a.id));
    const toAdd = newAttachments.filter((a) => !existingIds.has(a.id));
    const updatedAtts = [...currentAtts, ...toAdd];
    const updatedOrder: Order = {
      ...targetOrder,
      driveAttachments: updatedAtts,
      updatedAt: new Date().toISOString(),
    };

    setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
    if (drawerOrder?.id === orderId) {
      setDrawerOrder(updatedOrder);
    }

    try {
      setCloudSyncStatus('saving');
      await saveOrderToCloud(updatedOrder);
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Błąd zapisu załączników w chmurze:', err);
      setCloudSyncStatus('error');
    }
  };

  const handleRemoveDriveAttachment = async (orderId: string, fileId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const updatedAtts = (targetOrder.driveAttachments || []).filter((a) => a.id !== fileId);
    const updatedOrder: Order = {
      ...targetOrder,
      driveAttachments: updatedAtts,
      updatedAt: new Date().toISOString(),
    };

    setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
    if (drawerOrder?.id === orderId) {
      setDrawerOrder(updatedOrder);
    }

    try {
      setCloudSyncStatus('saving');
      await saveOrderToCloud(updatedOrder);
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Błąd usuwania załącznika:', err);
      setCloudSyncStatus('error');
    }
  };

  const handleRestoreOrdersFromDrive = async (restoredOrders: Order[]) => {
    setOrders(restoredOrders);
    setSelectedIds([]);
    try {
      setCloudSyncStatus('saving');
      await bulkUploadOrdersToCloud(restoredOrders);
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Błąd przywracania do chmury:', err);
      setCloudSyncStatus('error');
    }
  };

  // Bulk Operations + Cloud Sync
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleBulkComplete = async () => {
    const updatedOrders = orders.map((o) =>
      selectedIds.includes(o.id)
        ? {
            ...o,
            isCompleted: true,
            completedDate: o.completedDate || todayStr,
            updatedAt: new Date().toISOString(),
          }
        : o
    );

    setOrders(updatedOrders);
    const toUpdate = updatedOrders.filter((o) => selectedIds.includes(o.id));
    setSelectedIds([]);

    try {
      setCloudSyncStatus('saving');
      await bulkUploadOrdersToCloud(toUpdate);
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Błąd zbiorczego zapisu:', err);
      setCloudSyncStatus('error');
    }
  };

  // Request bulk delete
  const handleBulkDelete = () => {
    if (selectedIds.length > 0) {
      setIsBulkDeleteModalOpen(true);
    }
  };

  // Perform confirmed bulk delete
  const confirmBulkDelete = async () => {
    const idsToDelete = [...selectedIds];
    setOrders((prev) => prev.filter((o) => !idsToDelete.includes(o.id)));
    setSelectedIds([]);
    setIsBulkDeleteModalOpen(false);

    try {
      setCloudSyncStatus('saving');
      await bulkDeleteOrdersFromCloud(idsToDelete);
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Błąd zbiorczego usuwania:', err);
      setCloudSyncStatus('error');
    }
  };

  // Import / Export handlers + Cloud Sync
  const handleImportOrders = async (imported: Partial<Order>[], replaceExisting: boolean) => {
    const validatedOrders = imported.map((imp, idx) => ({
      id: imp.id || `ord-imp-${Date.now()}-${idx}`,
      orderNumber: imp.orderNumber || `ZAM-IMP-${idx + 1}`,
      description: imp.description || 'Zaimportowane zamówienie',
      customerName: imp.customerName || 'Klient',
      customerDetails: imp.customerDetails || '',
      startDate: imp.startDate || todayStr,
      endDate: imp.endDate || todayStr,
      isCompleted: Boolean(imp.isCompleted),
      completedDate: imp.isCompleted ? imp.completedDate || todayStr : undefined,
      priority: imp.priority || 'medium',
      amount: imp.amount || 0,
      quantity: imp.quantity || 1,
      category: imp.category || 'Ogólne',
      notes: imp.notes || '',
      createdAt: imp.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })) as Order[];

    try {
      setCloudSyncStatus('saving');
      if (replaceExisting) {
        // Delete previous and upload new
        const oldIds = orders.map((o) => o.id);
        if (oldIds.length > 0) {
          await bulkDeleteOrdersFromCloud(oldIds);
        }
        await bulkUploadOrdersToCloud(validatedOrders);
        setOrders(validatedOrders);
      } else {
        await bulkUploadOrdersToCloud(validatedOrders);
        setOrders((prev) => [...validatedOrders, ...prev]);
      }
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Błąd importu do chmury:', err);
      setCloudSyncStatus('error');
    }
  };

  const handleResetDefaults = async () => {
    try {
      setCloudSyncStatus('saving');
      await bulkUploadOrdersToCloud(SAMPLE_ORDERS);
      setOrders(SAMPLE_ORDERS);
      setTodayStr(systemRealDate);
      setSelectedIds([]);
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Błąd resetu do chmury:', err);
      setCloudSyncStatus('error');
    }
  };

  // Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and Sort Processing
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const metrics = calculateOrderMetrics(order, todayStr);

        // Filter by Status
        if (filterStatus === 'completed' && !metrics.isCompleted) return false;
        if (filterStatus === 'overdue' && (!metrics.isLate || metrics.isCompleted)) return false;
        if (filterStatus === 'in_progress' && (metrics.isCompleted || metrics.isLate)) return false;
        if (filterStatus === 'due_soon' && metrics.status !== 'due_soon') return false;

        // Filter by Category
        if (selectedCategory !== 'all' && order.category !== selectedCategory) return false;

        // Search Query (Order #, description, customer)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNum = order.orderNumber.toLowerCase().includes(q);
          const matchDesc = order.description.toLowerCase().includes(q);
          const matchCust = order.customerName.toLowerCase().includes(q);
          const matchNotes = (order.notes || '').toLowerCase().includes(q);
          if (!matchNum && !matchDesc && !matchCust && !matchNotes) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === 'endDate') {
          comp = a.endDate.localeCompare(b.endDate);
        } else if (sortField === 'startDate') {
          comp = a.startDate.localeCompare(b.startDate);
        } else if (sortField === 'orderNumber') {
          comp = a.orderNumber.localeCompare(b.orderNumber);
        } else if (sortField === 'customerName') {
          comp = a.customerName.localeCompare(b.customerName);
        } else if (sortField === 'amount') {
          comp = (a.amount || 0) - (b.amount || 0);
        } else if (sortField === 'status') {
          const ma = calculateOrderMetrics(a, todayStr);
          const mb = calculateOrderMetrics(b, todayStr);
          comp = ma.status.localeCompare(mb.status);
        }
        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [orders, todayStr, filterStatus, selectedCategory, searchQuery, sortField, sortDirection]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Application Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs">
              <span className="text-emerald-400 text-lg">&bull;</span>
              <span className="text-rose-400 text-lg ml-0.5">&bull;</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Dynamiczny Monitor Zamówień
              </h1>
              <p className="text-xs text-slate-500">
                Wizualne śledzenie postępu zamówień.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5">
            {/* Cloud Firestore Live Sync Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border shadow-xs transition ${
                cloudSyncStatus === 'synced'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : cloudSyncStatus === 'saving'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : cloudSyncStatus === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Baza w chmurze Google Cloud Firestore: dane nie zapisują się na Twoim komputerze ani dysku, lecz w niezależnej chmurze Google."
            >
              <Database className={`w-3.5 h-3.5 ${cloudSyncStatus === 'synced' ? 'text-emerald-600' : 'text-slate-600'}`} />
              <span className="hidden lg:inline">Chmura:</span>
              <span className="font-semibold">
                {cloudSyncStatus === 'synced' && 'Firestore Online'}
                {cloudSyncStatus === 'saving' && 'Zapis w chmurze...'}
                {cloudSyncStatus === 'connecting' && 'Łączenie z chmurą...'}
                {cloudSyncStatus === 'error' && 'Błąd chmury'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  cloudSyncStatus === 'synced'
                    ? 'bg-emerald-500 ring-2 ring-emerald-200'
                    : cloudSyncStatus === 'saving'
                    ? 'bg-amber-500 animate-pulse'
                    : cloudSyncStatus === 'error'
                    ? 'bg-rose-500'
                    : 'bg-slate-400 animate-pulse'
                }`}
              />
            </div>

            {/* Google Drive Integration Button */}
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border shadow-xs transition cursor-pointer ${
                currentUser
                  ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Dysk Google - kopie zapasowe, synchronizacja i załączniki"
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Google'}
                  className="w-4 h-4 rounded-full border border-blue-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Cloud className={`w-3.5 h-3.5 ${currentUser ? 'text-blue-600' : 'text-slate-500'}`} />
              )}
              <span>Dysk Google</span>
              {currentUser && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </button>

            {/* Excel / CSV Modal Button */}
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Excel / CSV</span>
            </button>

            {/* New Order Button */}
            <button
              onClick={() => {
                setEditingOrder(null);
                setIsDuplicateMode(false);
                setIsOrderModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Nowe zamówienie
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-5">
        {/* Interactive Today Scrubber & Simulator Bar */}
        <TodayDateController
          todayStr={todayStr}
          onDateChange={setTodayStr}
          onResetToday={() => setTodayStr(systemRealDate)}
          systemRealDate={systemRealDate}
        />

        {/* Metrics KPI Cards & Hierarchy Rules Overview */}
        <MetricsHeader
          orders={orders}
          todayStr={todayStr}
          onFilterChange={setFilterStatus}
          activeFilter={filterStatus}
        />

        {/* Controls Bar: Search, Category Filter, Status Filter Tabs, View Switcher */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Left: Search & Category */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj po nr zamówienia, opisie, kliencie..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs cursor-pointer"
              >
                <option value="all">Wszystkie kategorie</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Right: View Mode Toggle (Table / Gantt Timeline / Cards) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Widok tabeli arkuszowej z paskami Gantta w komórkach"
              >
                <TableIcon className="w-3.5 h-3.5" />
                Tabela
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'gantt'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Zbiorcza tablica osi czasu Gantta"
              >
                <CalendarRange className="w-3.5 h-3.5" />
                Oś Gantta
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Karty zamówień do szybkiego przeglądu"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Karty
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>Wyświetlanie:</span>
            <span className="font-bold text-slate-800">{filteredOrders.length}</span> z{' '}
            <span className="font-bold text-slate-800">{orders.length}</span> zamówień
            {filterStatus !== 'all' && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-medium">
                Filtr:{' '}
                {filterStatus === 'in_progress'
                  ? 'W toku'
                  : filterStatus === 'overdue'
                  ? 'Po terminie'
                  : filterStatus === 'completed'
                  ? 'Zakończone'
                  : filterStatus === 'due_soon'
                  ? 'Pilne / Bliski termin'
                  : filterStatus}
                <button onClick={() => setFilterStatus('all')} className="hover:text-rose-600 font-bold ml-1 cursor-pointer">
                  &times;
                </button>
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-medium">
                Kategoria: {selectedCategory}
                <button onClick={() => setSelectedCategory('all')} className="hover:text-rose-600 font-bold ml-1 cursor-pointer">
                  &times;
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Active View Container */}
        {viewMode === 'table' && (
          <OrderTable
            orders={filteredOrders}
            todayStr={todayStr}
            selectedIds={selectedIds}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onToggleComplete={handleToggleComplete}
            onEdit={(order) => {
              setEditingOrder(order);
              setIsDuplicateMode(false);
              setIsOrderModalOpen(true);
            }}
            onDuplicate={handleDuplicateOrder}
            onDelete={handleDeleteOrder}
            onViewDetails={(order) => setDrawerOrder(order)}
            onBulkComplete={handleBulkComplete}
            onBulkDelete={handleBulkDelete}
          />
        )}

        {viewMode === 'gantt' && (
          <TimelineGlobalView
            orders={filteredOrders}
            todayStr={todayStr}
            onToggleComplete={handleToggleComplete}
            onSelectOrder={(order) => setDrawerOrder(order)}
          />
        )}

        {viewMode === 'cards' && (
          <OrderCardsView
            orders={filteredOrders}
            todayStr={todayStr}
            onToggleComplete={handleToggleComplete}
            onEdit={(order) => {
              setEditingOrder(order);
              setIsDuplicateMode(false);
              setIsOrderModalOpen(true);
            }}
            onDuplicate={handleDuplicateOrder}
            onDelete={handleDeleteOrder}
            onViewDetails={(order) => setDrawerOrder(order)}
          />
        )}
      </main>

      {/* Slide-Over Order Inspector Drawer */}
      <OrderDetailsDrawer
        order={drawerOrder}
        todayStr={todayStr}
        isOpen={Boolean(drawerOrder)}
        onClose={() => setDrawerOrder(null)}
        onToggleComplete={handleToggleComplete}
        onEdit={(order) => {
          setEditingOrder(order);
          setIsDuplicateMode(false);
          setIsOrderModalOpen(true);
        }}
        onDuplicate={handleDuplicateOrder}
        onUpdateNotes={handleUpdateNotes}
        onOpenDrivePicker={(order) => {
          setDrivePickerTargetOrder(order);
        }}
        onRemoveDriveAttachment={handleRemoveDriveAttachment}
      />

      {/* Add / Edit / Duplicate Order Modal */}
      <OrderModal
        isOpen={isOrderModalOpen}
        order={editingOrder}
        isDuplicate={isDuplicateMode}
        onClose={() => {
          setIsOrderModalOpen(false);
          setEditingOrder(null);
          setIsDuplicateMode(false);
        }}
        onSave={handleSaveOrder}
      />

      {/* CSV Import & Export Modal */}
      <CsvImportExportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        orders={orders}
        onImportOrders={handleImportOrders}
        onResetDefaults={handleResetDefaults}
      />

      {/* Google Drive Hub Modal (Backups, Exports, Explorer) */}
      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        orders={orders}
        todayStr={todayStr}
        currentUser={currentUser}
        accessToken={accessToken}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleGoogleSignOut}
        onRestoreOrders={handleRestoreOrdersFromDrive}
      />

      {/* Google Drive File Picker for Specific Order */}
      {drivePickerTargetOrder && (
        <DriveFilePickerModal
          isOpen={Boolean(drivePickerTargetOrder)}
          onClose={() => setDrivePickerTargetOrder(null)}
          order={drivePickerTargetOrder}
          accessToken={accessToken}
          onAttachFiles={handleAttachDriveFiles}
          onSignIn={handleGoogleSignIn}
        />
      )}

      {/* Single Order Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(orderToDelete)}
        title="Usunąć zamówienie?"
        message={
          orderToDelete
            ? `Czy na pewno chcesz usunąć zlecenie ${orderToDelete.orderNumber} (${orderToDelete.description})? Zamówienie zostanie trwale usunięte z bazy w chmurze Firestore.`
            : ''
        }
        confirmText="Usuń zlecenie"
        cancelText="Anuluj"
        variant="danger"
        onConfirm={confirmDeleteSingleOrder}
        onClose={() => setOrderToDelete(null)}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title="Usunąć zaznaczone zlecenia?"
        message={`Czy na pewno chcesz trwale usunąć ${selectedIds.length} zaznaczonych zleceń z bazy w chmurze Google Cloud Firestore?`}
        confirmText={`Usuń (${selectedIds.length})`}
        cancelText="Anuluj"
        variant="danger"
        onConfirm={confirmBulkDelete}
        onClose={() => setIsBulkDeleteModalOpen(false)}
      />
    </div>
  );
}
