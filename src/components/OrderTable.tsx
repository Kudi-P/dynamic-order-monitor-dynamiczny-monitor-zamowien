import React from 'react';
import { Order, SortField, SortDirection } from '../types';
import { OrderRow } from './OrderRow';
import { ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Trash2, CheckCircle2 } from 'lucide-react';

interface OrderTableProps {
  orders: Order[];
  todayStr: string;
  selectedIds: string[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onToggleComplete: (id: string) => void;
  onEdit: (order: Order) => void;
  onDuplicate: (order: Order) => void;
  onDelete: (id: string) => void;
  onViewDetails: (order: Order) => void;
  onBulkComplete: () => void;
  onBulkDelete: () => void;
}

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  todayStr,
  selectedIds,
  sortField,
  sortDirection,
  onSort,
  onToggleSelect,
  onSelectAll,
  onToggleComplete,
  onEdit,
  onDuplicate,
  onDelete,
  onViewDetails,
  onBulkComplete,
  onBulkDelete,
}) => {
  const isAllSelected = orders.length > 0 && selectedIds.length === orders.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < orders.length;

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-slate-900" />
    ) : (
      <ArrowDown className="w-3 h-3 text-slate-900" />
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Batch Actions Bar (when rows are selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between transition-all">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>Zaznaczono {selectedIds.length} {selectedIds.length === 1 ? 'zamówienie' : 'zamówień'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBulkComplete}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Oznacz jako zakończone (Zasada 1)
            </button>
            <button
              onClick={onBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Usuń zaznaczone
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {/* Select All Checkbox */}
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isPartiallySelected;
                  }}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                />
              </th>

              {/* Status / Checkmark Column */}
              <th className="py-3 px-3 w-12 text-center">
                <span title="Status ukończenia: Prawda ustawia kolor zielony">Stan</span>
              </th>

              {/* Order # */}
              <th
                onClick={() => onSort('orderNumber')}
                className="py-3 px-3 cursor-pointer group hover:bg-slate-100/70 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Nr zamówienia</span>
                  {renderSortIcon('orderNumber')}
                </div>
              </th>

              {/* Description */}
              <th className="py-3 px-3 min-w-[200px]">Opis</th>

              {/* Customer */}
              <th
                onClick={() => onSort('customerName')}
                className="py-3 px-3 cursor-pointer group hover:bg-slate-100/70 transition min-w-[160px]"
              >
                <div className="flex items-center gap-1">
                  <span>Klient i dane</span>
                  {renderSortIcon('customerName')}
                </div>
              </th>

              {/* Dates */}
              <th
                onClick={() => onSort('endDate')}
                className="py-3 px-3 cursor-pointer group hover:bg-slate-100/70 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Harmonogram (Termin)</span>
                  {renderSortIcon('endDate')}
                </div>
              </th>

              {/* Visual Bar (The Chart) */}
              <th className="py-3 px-3 min-w-[240px]">
                <div className="flex items-center justify-between">
                  <span>Wykres</span>
                  <span className="text-[10px] font-normal lowercase tracking-normal text-slate-500">
                    przerywana linia = dziś
                  </span>
                </div>
              </th>

              {/* Status Badge */}
              <th
                onClick={() => onSort('status')}
                className="py-3 px-3 text-center cursor-pointer group hover:bg-slate-100/70 transition"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  {renderSortIcon('status')}
                </div>
              </th>

              {/* Actions */}
              <th className="py-3 px-3 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-500">
                  <p className="text-sm font-medium">Nie znaleziono zamówień.</p>
                  <p className="text-xs text-slate-400 mt-1">Spróbuj wyczyścić filtry lub dodać nowe zamówienie.</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  todayStr={todayStr}
                  isSelected={selectedIds.includes(order.id)}
                  onToggleSelect={onToggleSelect}
                  onToggleComplete={onToggleComplete}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onViewDetails={onViewDetails}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
