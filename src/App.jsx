import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const STORAGE_KEY = 'monthly-bills-ui-locked-final';

const demoBills = [
  {
    id: 1,
    title: 'Kuryente',
    amount: 600,
    dueDate: '2026-03-26',
    status: 'Unpaid',
    category: 'Utilities',
    order: 0,
  },
  {
    id: 2,
    title: 'Paylater',
    amount: 1296,
    dueDate: '2026-03-21',
    status: 'Unpaid',
    category: 'Loans',
    order: 1,
  },
  {
    id: 3,
    title: 'Wifey',
    amount: 4000,
    dueDate: '2026-03-18',
    status: 'Unpaid',
    category: 'Personal',
    order: 2,
  },
  {
    id: 4,
    title: 'Paluwagan',
    amount: 2500,
    dueDate: '2026-03-28',
    status: 'Unpaid',
    category: 'Savings',
    order: 3,
  },
  {
    id: 5,
    title: 'Wifi',
    amount: 1000,
    dueDate: '2026-03-29',
    status: 'Unpaid',
    category: 'Utilities',
    order: 4,
  },
  {
    id: 6,
    title: 'Netflix',
    amount: 295,
    dueDate: '2026-03-10',
    status: 'Paid',
    category: 'Entertainment',
    order: 5,
  },
  {
    id: 7,
    title: 'Spotify',
    amount: 149,
    dueDate: '2026-03-08',
    status: 'Paid',
    category: 'Entertainment',
    order: 6,
  },
];

function normalizeBills(items) {
  return items.map((bill, index) => ({
    category: 'Other',
    ...bill,
    order: typeof bill.order === 'number' ? bill.order : index,
  }));
}

function peso(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function daysDiff(dateString) {
  const due = new Date(dateString);
  due.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function getBillState(bill) {
  if (bill.status === 'Paid') return 'Paid';

  const diff = daysDiff(bill.dueDate);
  if (diff < 0) return 'Late';
  if (diff <= 5) return 'Due';
  return 'Unpaid';
}

function pillClass(state) {
  if (state === 'Paid') return 'bg-green-600 text-white';
  if (state === 'Due') return 'bg-amber-400 text-neutral-900';
  if (state === 'Late') return 'bg-red-500 text-white';
  return 'bg-neutral-300 text-neutral-700';
}

function RowMenu({ bill, onEdit, onDelete, onTogglePaid, open, setOpen }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(open ? null : bill.id)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            className="absolute right-0 top-10 z-30 min-w-[150px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
          >
            <button
              type="button"
              onClick={() => {
                onTogglePaid(bill.id);
                setOpen(null);
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {bill.status === 'Paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
            </button>

            <button
              type="button"
              onClick={() => {
                onEdit(bill);
                setOpen(null);
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>

            <button
              type="button"
              onClick={() => {
                onDelete(bill.id);
                setOpen(null);
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SortableBillRow({
  bill,
  menuOpenId,
  setMenuOpenId,
  onEdit,
  onDelete,
  onTogglePaid,
}) {
  const state = getBillState(bill);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(bill.id),
    disabled: bill.status === 'Paid',
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mx-4 border-b border-neutral-200 last:border-b-0 ${isDragging ? 'z-20 opacity-90' : ''}`}
    >
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 py-3">
        <button
          type="button"
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            bill.status === 'Paid'
              ? 'cursor-default text-neutral-300'
              : 'cursor-grab text-neutral-500 active:cursor-grabbing'
          }`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="min-w-0 pr-2 text-[17px] font-semibold tracking-tight text-neutral-900">
          <span className="block truncate">{bill.title}</span>
        </div>

        <div className="w-[96px] text-right text-[17px] font-bold tabular-nums text-neutral-900">
          {peso(bill.amount)}
        </div>

        <div className="w-[84px] text-right">
          <span
            className={`inline-flex min-w-[74px] items-center justify-center rounded-xl px-3 py-1.5 text-sm font-semibold ${pillClass(state)}`}
          >
            {state}
          </span>
        </div>

        <div className="flex justify-end">
          <RowMenu
            bill={bill}
            onEdit={onEdit}
            onDelete={onDelete}
            onTogglePaid={onTogglePaid}
            open={menuOpenId === bill.id}
            setOpen={setMenuOpenId}
          />
        </div>
      </div>
    </div>
  );
}

function BillFormModal({
  open,
  onClose,
  onSave,
  editingBill,
}) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    dueDate: '',
    category: 'Other',
    status: 'Unpaid',
  });

  useEffect(() => {
    if (editingBill) {
      setForm({
        title: editingBill.title || '',
        amount: String(editingBill.amount || ''),
        dueDate: editingBill.dueDate || '',
        category: editingBill.category || 'Other',
        status: editingBill.status || 'Unpaid',
      });
      return;
    }

    setForm({
      title: '',
      amount: '',
      dueDate: '',
      category: 'Other',
      status: 'Unpaid',
    });
  }, [editingBill, open]);

  if (!open) return null;

  function submitForm(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.amount || !form.dueDate) return;

    onSave({
      title: form.title.trim(),
      amount: Number(form.amount),
      dueDate: form.dueDate,
      category: form.category,
      status: form.status,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-3 py-3 md:items-center">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="text-lg font-bold text-neutral-900">
            {editingBill ? 'Edit Bill' : 'Add New Bill'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submitForm} className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              Bill Name
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="e.g. Kuryente"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              Amount
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="e.g. 600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              Due Date
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700">
                Category
              </label>
              <input
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="e.g. Utilities"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option>Unpaid</option>
                <option>Paid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              {editingBill ? 'Save Changes' : 'Add Bill'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [bills, setBills] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? normalizeBills(JSON.parse(saved)) : normalizeBills(demoBills);
    } catch {
      return normalizeBills(demoBills);
    }
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } })
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  }, [bills]);

  const unpaidBills = useMemo(
    () =>
      bills
        .filter((bill) => bill.status !== 'Paid')
        .sort((a, b) => a.order - b.order),
    [bills]
  );

  const paidBills = useMemo(
    () =>
      bills
        .filter((bill) => bill.status === 'Paid')
        .sort((a, b) => a.order - b.order),
    [bills]
  );

  const orderedBills = [...unpaidBills, ...paidBills];

  const totals = useMemo(() => {
    const paid = bills
      .filter((bill) => bill.status === 'Paid')
      .reduce((sum, bill) => sum + bill.amount, 0);

    const unpaid = bills
      .filter((bill) => bill.status !== 'Paid')
      .reduce((sum, bill) => sum + bill.amount, 0);

    return { paid, unpaid };
  }, [bills]);

  function openAdd() {
    setEditingBill(null);
    setIsFormOpen(true);
  }

  function openEdit(bill) {
    setEditingBill(bill);
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingBill(null);
    setIsFormOpen(false);
  }

  function saveBill(data) {
    if (editingBill) {
      setBills((prev) =>
        prev.map((bill) =>
          bill.id === editingBill.id
            ? {
                ...bill,
                ...data,
              }
            : bill
        )
      );
      closeForm();
      return;
    }

    const nextOrder =
      bills.filter((bill) => bill.status !== 'Paid').length;

    setBills((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...data,
        order: data.status === 'Paid' ? prev.length + 1 : nextOrder,
      },
    ]);

    closeForm();
  }

  function deleteBill(id) {
    if (!window.confirm('Delete this bill?')) return;
    setBills((prev) => prev.filter((bill) => bill.id !== id));
  }

  function togglePaid(id) {
    setBills((prev) => {
      const current = prev.find((bill) => bill.id === id);
      if (!current) return prev;

      const nextStatus = current.status === 'Paid' ? 'Unpaid' : 'Paid';
      const nextOrder =
        nextStatus === 'Paid'
          ? prev.length + 1
          : prev.filter((bill) => bill.status !== 'Paid').length;

      return prev.map((bill) =>
        bill.id === id
          ? {
              ...bill,
              status: nextStatus,
              order: nextOrder,
            }
          : bill
      );
    });
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = Number(active.id);
    const overId = Number(over.id);

    const currentActiveBills = bills
      .filter((bill) => bill.status !== 'Paid')
      .sort((a, b) => a.order - b.order);

    const oldIndex = currentActiveBills.findIndex((bill) => bill.id === activeId);
    const newIndex = currentActiveBills.findIndex((bill) => bill.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(currentActiveBills, oldIndex, newIndex).map((bill, index) => ({
      ...bill,
      order: index,
    }));

    setBills((prev) => {
      const paidOnly = prev.filter((bill) => bill.status === 'Paid');
      return [...reordered, ...paidOnly];
    });
  }

  return (
    <>
      <div className="min-h-screen bg-[#efeff4] px-3 py-4 md:px-6">
        <div className="mx-auto max-w-md rounded-[34px] bg-[#f7f7fb] shadow-[0_20px_50px_rgba(16,24,40,0.12)] ring-1 ring-black/5">
          <div className="px-5 pb-3 pt-5">
            <div className="flex items-start justify-end">
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={openAdd}
                className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#4e94ff] to-[#2667d8] text-white shadow-[0_12px_24px_rgba(37,84,164,0.28)]"
              >
                <Plus className="h-9 w-9" />
              </motion.button>
            </div>

            <div className="-mt-10 px-2 text-center">
              <h1 className="text-[28px] font-bold tracking-tight text-[#13295b]">
                Monthly Bills
              </h1>

              <div className="mt-4 border-t border-neutral-300 pt-4">
                <p className="text-[17px] italic text-[#2f4e8a]">
                  Pay today, stress less tomorrow.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-[18px] bg-gradient-to-br from-[#4f93ff] to-[#2c67d8] px-5 py-4 text-white shadow-[0_12px_24px_rgba(37,84,164,0.22)]">
                <div className="text-[18px] font-medium">Total Paid</div>
                <div className="mt-2 text-[26px] font-bold tracking-tight tabular-nums">
                  {peso(totals.paid)}
                </div>
              </div>

              <div className="rounded-[18px] bg-gradient-to-br from-[#a8b4cc] to-[#8997b4] px-5 py-4 text-white shadow-[0_12px_24px_rgba(137,151,180,0.18)]">
                <div className="text-[18px] font-medium">Total Unpaid</div>
                <div className="mt-2 text-[26px] font-bold tracking-tight tabular-nums">
                  {peso(totals.unpaid)}
                </div>
              </div>
            </div>
          </div>

          <div className="pb-5">
            <div className="mx-3 overflow-hidden rounded-[22px] border border-[#e3e5ef] bg-white shadow-[0_12px_28px_rgba(16,24,40,0.08)]">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={unpaidBills.map((bill) => String(bill.id))}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedBills.map((bill) => (
                    <SortableBillRow
                      key={bill.id}
                      bill={bill}
                      menuOpenId={menuOpenId}
                      setMenuOpenId={setMenuOpenId}
                      onEdit={openEdit}
                      onDelete={deleteBill}
                      onTogglePaid={togglePaid}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>

          <div className="rounded-b-[34px] bg-gradient-to-br from-[#245bc3] via-[#2d69d7] to-[#245bc3] px-6 py-6 text-center text-white">
            <div className="text-[17px] font-semibold italic">
              Every bill paid is one less worry.
            </div>
            <div className="mx-auto mt-3 h-px w-full max-w-[280px] bg-white/45" />
            <div className="mt-3 text-[17px] font-semibold italic">
              One step closer to zero balance.
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen ? (
          <BillFormModal
            open={isFormOpen}
            onClose={closeForm}
            onSave={saveBill}
            editingBill={editingBill}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
function SortableBillRow({
  bill,
  menuOpenId,
  setMenuOpenId,
  onEdit,
  onDelete,
  onTogglePaid,
}) {
  const state = getBillState(bill);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(bill.id),
disabled: bill.status === 'Paid',
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mx-4 border-b border-neutral-200 last:border-b-0 ${isDragging ? 'z-20 opacity-90' : ''}`}
    >
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 py-3">
        <button
          type="button"
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            bill.status === 'Paid'
              ? 'cursor-default text-neutral-300'
              : 'cursor-grab text-neutral-500 active:cursor-grabbing'
          }`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="min-w-0 pr-2 text-[17px] font-semibold tracking-tight text-neutral-900">
          <span className="block truncate">{bill.title}</span>
        </div>

        <div className="w-[96px] text-right text-[17px] font-bold tabular-nums text-neutral-900">
          {peso(bill.amount)}
        </div>

        <div className="w-[84px] text-right">
          <span
            className={`inline-flex min-w-[74px] items-center justify-center rounded-xl px-3 py-1.5 text-sm font-semibold ${pillClass(state)}`}
          >
            {state}
          </span>
        </div>

        <div className="flex justify-end">
          <RowMenu
            bill={bill}
            onEdit={onEdit}
            onDelete={onDelete}
            onTogglePaid={onTogglePaid}
            open={menuOpenId === bill.id}
            setOpen={setMenuOpenId}
          />
        </div>
      </div>
    </div>
  );
}

function BillFormModal({
  open,
  onClose,
  onSave,
  editingBill,
}) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    dueDate: '',
    category: 'Other',
    status: 'Unpaid',
  });

  useEffect(() => {
    if (editingBill) {
      setForm({
        title: editingBill.title || '',
        amount: String(editingBill.amount || ''),
        dueDate: editingBill.dueDate || '',
        category: editingBill.category || 'Other',
        status: editingBill.status || 'Unpaid',
      });
      return;
    }

    setForm({
      title: '',
      amount: '',
      dueDate: '',
      category: 'Other',
      status: 'Unpaid',
    });
  }, [editingBill, open]);

  if (!open) return null;

  function submitForm(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.amount || !form.dueDate) return;

    onSave({
      title: form.title.trim(),
      amount: Number(form.amount),
      dueDate: form.dueDate,
      category: form.category,
      status: form.status,
    });
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-3 py-3 md:items-center">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="text-lg font-bold text-neutral-900">
            {editingBill ? 'Edit Bill' : 'Add New Bill'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submitForm} className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              Bill Name
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="e.g. Kuryente"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              Amount
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="e.g. 600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              Due Date
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700">
                Category
              </label>
              <input
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="e.g. Utilities"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option>Unpaid</option>
                <option>Paid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              {editingBill ? 'Save Changes' : 'Add Bill'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
export default function App() {
  const [bills, setBills] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? normalizeBills(JSON.parse(saved)) : normalizeBills(demoBills);
    } catch {
      return normalizeBills(demoBills);
    }
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } })
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  }, [bills]);

  const unpaidBills = useMemo(
    () =>
      bills
        .filter((bill) => bill.status !== 'Paid')
        .sort((a, b) => a.order - b.order),
    [bills]
  );

  const paidBills = useMemo(
    () =>
      bills
        .filter((bill) => bill.status === 'Paid')
        .sort((a, b) => a.order - b.order),
    [bills]
  );

  const orderedBills = [...unpaidBills, ...paidBills];

  const totals = useMemo(() => {
    const paid = bills
      .filter((bill) => bill.status === 'Paid')
      .reduce((sum, bill) => sum + bill.amount, 0);

    const unpaid = bills
      .filter((bill) => bill.status !== 'Paid')
      .reduce((sum, bill) => sum + bill.amount, 0);

    return { paid, unpaid };
  }, [bills]);

  function openAdd() {
    setEditingBill(null);
    setIsFormOpen(true);
  }

  function openEdit(bill) {
    setEditingBill(bill);
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingBill(null);
    setIsFormOpen(false);
  }

  function saveBill(data) {
    if (editingBill) {
      setBills((prev) =>
        prev.map((bill) =>
          bill.id === editingBill.id
            ? {
                ...bill,
                ...data,
              }
            : bill
        )
      );
      closeForm();
      return;
               }
    const nextOrder =
      bills.filter((bill) => bill.status !== 'Paid').length;

    setBills((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...data,
        order: data.status === 'Paid' ? prev.length + 1 : nextOrder,
      },
    ]);

    closeForm();
  }

  function deleteBill(id) {
    if (!window.confirm('Delete this bill?')) return;
    setBills((prev) => prev.filter((bill) => bill.id !== id));
  }

  function togglePaid(id) {
    setBills((prev) => {
      const current = prev.find((bill) => bill.id === id);
      if (!current) return prev;

      const nextStatus = current.status === 'Paid' ? 'Unpaid' : 'Paid';
      const nextOrder =
        nextStatus === 'Paid'
          ? prev.length + 1
          : prev.filter((bill) => bill.status !== 'Paid').length;

      return prev.map((bill) =>
        bill.id === id
          ? {
              ...bill,
              status: nextStatus,
              order: nextOrder,
            }
          : bill
      );
    });
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = Number(active.id);
    const overId = Number(over.id);

    const currentActiveBills = bills
      .filter((bill) => bill.status !== 'Paid')
      .sort((a, b) => a.order - b.order);

    const oldIndex = currentActiveBills.findIndex((bill) => bill.id === activeId);
    const newIndex = currentActiveBills.findIndex((bill) => bill.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(currentActiveBills, oldIndex, newIndex).map((bill, index) => ({
      ...bill,
      order: index,
    }));
    setBills((prev) => {
      const paidOnly = prev.filter((bill) => bill.status === 'Paid');
      return [...reordered, ...paidOnly];
    });
  }

  return (
    <>
      <div className="min-h-screen bg-[#efeff4] px-3 py-4 md:px-6">
        <div className="mx-auto max-w-md rounded-[34px] bg-[#f7f7fb] shadow-[0_20px_50px_rgba(16,24,40,0.12)] ring-1 ring-black/5">
          <div className="px-5 pb-3 pt-5">
            <div className="flex items-start justify-end">
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={openAdd}
                className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#4e94ff] to-[#2667d8] text-white shadow-[0_12px_24px_rgba(37,84,164,0.28)]"
              >
                <Plus className="h-9 w-9" />
              </motion.button>
            </div>

            <div className="-mt-10 px-2 text-center">
              <h1 className="text-[28px] font-bold tracking-tight text-[#13295b]">
                Monthly Bills
              </h1>

              <div className="mt-4 border-t border-neutral-300 pt-4">
                <p className="text-[17px] italic text-[#2f4e8a]">
                  Pay today, stress less tomorrow.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-[18px] bg-gradient-to-br from-[#4f93ff] to-[#2c67d8] px-5 py-4 text-white shadow-[0_12px_24px_rgba(37,84,164,0.22)]">
                <div className="text-[18px] font-medium">Total Paid</div>
                <div className="mt-2 text-[26px] font-bold tracking-tight tabular-nums">
                  {peso(totals.paid)}
                </div>
              </div>

              <div className="rounded-[18px] bg-gradient-to-br from-[#a8b4cc] to-[#8997b4] px-5 py-4 text-white shadow-[0_12px_24px_rgba(137,151,180,0.18)]">
                <div className="text-[18px] font-medium">Total Unpaid</div>
                <div className="mt-2 text-[26px] font-bold tracking-tight tabular-nums">
                  {peso(totals.unpaid)}
                </div>
              </div>
            </div>
          </div>

          <div className="pb-5">
            <div className="mx-3 overflow-hidden rounded-[22px] border border-[#e3e5ef] bg-white shadow-[0_12px_28px_rgba(16,24,40,0.08)]">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={unpaidBills.map((bill) => String(bill.id))}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedBills.map((bill) => (
                    <SortableBillRow
                      key={bill.id}
                      bill={bill}
                      menuOpenId={menuOpenId}
                      setMenuOpenId={setMenuOpenId}
                      onEdit={openEdit}
                      onDelete={deleteBill}
                      onTogglePaid={togglePaid}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>

          <div className="rounded-b-[34px] bg-gradient-to-br from-[#245bc3] via-[#2d69d7] to-[#245bc3] px-6 py-6 text-center text-white">
            <div className="text-[17px] font-semibold italic">
              Every bill paid is one less worry.
            </div>
            <div className="mx-auto mt-3 h-px w-full max-w-[280px] bg-white/45" />
            <div className="mt-3 text-[17px] font-semibold italic">
              One step closer to zero balance.
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen ? (
          <BillFormModal
            open={isFormOpen}
            onClose={closeForm}
            onSave={saveBill}
            editingBill={editingBill}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
                                       }
