'use client';

import { useState } from 'react';
import { adminGalleries } from '@/lib/api';
import type { KanbanCard } from '@/lib/api';
import { useToast } from './Toast';

interface KanbanBoardProps {
  galleryId: string;
  initialCards: KanbanCard[];
  onUpdate: () => void;
}

type CardStatus = KanbanCard['status'];

const COLUMNS: { status: CardStatus; label: string; color: string; bg: string }[] = [
  { status: 'todo', label: 'To Do', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  { status: 'in_progress', label: 'In Progress', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  { status: 'done', label: 'Done', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
];

const STATUS_ORDER: CardStatus[] = ['todo', 'in_progress', 'done'];

export function KanbanBoard({ galleryId, initialCards, onUpdate }: KanbanBoardProps) {
  const { showSuccess, showError } = useToast();
  const [cards, setCards] = useState<KanbanCard[]>(initialCards);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const columnCards = (status: CardStatus) =>
    cards.filter(c => c.status === status).sort((a, b) => a.order - b.order);

  const addCard = () => {
    const title = newTitle.trim();
    if (!title) return;
    const card: KanbanCard = {
      id: crypto.randomUUID(),
      title,
      status: 'todo',
      order: columnCards('todo').length,
      createdAt: new Date().toISOString(),
    };
    setCards(prev => [...prev, card]);
    setNewTitle('');
  };

  const moveCard = (id: string, direction: -1 | 1) => {
    setCards(prev => {
      const card = prev.find(c => c.id === id);
      if (!card) return prev;
      const idx = STATUS_ORDER.indexOf(card.status);
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= STATUS_ORDER.length) return prev;
      const newStatus = STATUS_ORDER[newIdx] as CardStatus;
      const targetCards = prev.filter(c => c.status === newStatus);
      return prev.map(c =>
        c.id === id ? { ...c, status: newStatus, order: targetCards.length } : c
      );
    });
  };

  const deleteCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminGalleries.update(galleryId, { kanbanCards: cards });
      showSuccess('Kanban board saved');
      onUpdate();
    } catch {
      showError('Failed to save kanban board');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(cards) !== JSON.stringify(initialCards);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-neutral-50"
      >
        <h3 className="text-lg font-semibold text-neutral-900">Kanban Board</h3>
        <span className="text-neutral-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Add card input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCard()}
              placeholder="New card title..."
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={addCard}
              disabled={!newTitle.trim()}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {/* Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map(col => {
              const colCards = columnCards(col.status);
              return (
                <div key={col.status} className={`rounded-lg border p-3 ${col.bg}`}>
                  <h4 className={`text-sm font-semibold mb-3 ${col.color}`}>
                    {col.label} ({colCards.length})
                  </h4>
                  <div className="space-y-2 min-h-[60px]">
                    {colCards.map(card => (
                      <div
                        key={card.id}
                        className="bg-white rounded-lg border border-neutral-200 p-2 flex items-center gap-2 shadow-sm"
                      >
                        <span className="flex-1 text-sm text-neutral-800 truncate">{card.title}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {col.status !== 'todo' && (
                            <button
                              onClick={() => moveCard(card.id, -1)}
                              className="text-neutral-400 hover:text-neutral-700 text-xs p-1"
                              title="Move left"
                            >
                              ←
                            </button>
                          )}
                          {col.status !== 'done' && (
                            <button
                              onClick={() => moveCard(card.id, 1)}
                              className="text-neutral-400 hover:text-neutral-700 text-xs p-1"
                              title="Move right"
                            >
                              →
                            </button>
                          )}
                          <button
                            onClick={() => deleteCard(card.id)}
                            className="text-neutral-400 hover:text-red-600 text-xs p-1"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving || !hasChanges}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
