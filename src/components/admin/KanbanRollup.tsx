'use client';

import { useState } from 'react';
import Link from 'next/link';

interface GalleryKanban {
  id: string;
  title: string;
  kanban: { todo: string[]; inProgress: string[]; doneCount: number } | null;
}

interface KanbanRollupProps {
  galleries: GalleryKanban[];
}

export function KanbanRollup({ galleries }: KanbanRollupProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const activeGalleries = galleries.filter(
    g => g.kanban && (g.kanban.todo.length > 0 || g.kanban.inProgress.length > 0)
  );
  const completedGalleries = galleries.filter(g => g.kanban && g.kanban.doneCount > 0);

  if (activeGalleries.length === 0 && completedGalleries.length === 0) {
    return null;
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalCompleted = completedGalleries.reduce(
    (sum, g) => sum + (g.kanban?.doneCount || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Active Work */}
      {activeGalleries.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            Active Work
            <span className="ml-2 text-sm font-normal text-neutral-500">
              {activeGalleries.length} {activeGalleries.length === 1 ? 'gallery' : 'galleries'}
            </span>
          </h2>
          <div className="space-y-1">
            {activeGalleries.map(g => {
              const isExpanded = expanded.has(g.id);
              const kanban = g.kanban!;
              return (
                <div key={g.id} className="border border-neutral-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleExpand(g.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 text-left"
                  >
                    <span className="text-neutral-400 text-xs w-4">
                      {isExpanded ? '\u25BC' : '\u25B6'}
                    </span>
                    <span className="font-medium text-neutral-900 flex-1 truncate">
                      {g.title}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      {kanban.todo.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {kanban.todo.length} To Do
                        </span>
                      )}
                      {kanban.inProgress.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          {kanban.inProgress.length} In Progress
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/admin/galleries/edit?id=${g.id}`}
                      onClick={e => e.stopPropagation()}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium shrink-0"
                    >
                      Edit &rarr;
                    </Link>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 ml-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {kanban.todo.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-blue-700 mb-2">To Do</h4>
                          <ul className="space-y-1">
                            {kanban.todo.map((title, i) => (
                              <li
                                key={i}
                                className="text-sm text-neutral-700 pl-3 border-l-2 border-blue-200"
                              >
                                {title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {kanban.inProgress.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-amber-700 mb-2">In Progress</h4>
                          <ul className="space-y-1">
                            {kanban.inProgress.map((title, i) => (
                              <li
                                key={i}
                                className="text-sm text-neutral-700 pl-3 border-l-2 border-amber-200"
                              >
                                {title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Work */}
      {completedGalleries.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Completed Work</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-2 text-neutral-500 font-medium">Gallery</th>
                <th className="text-right py-2 text-neutral-500 font-medium">Tasks Completed</th>
              </tr>
            </thead>
            <tbody>
              {completedGalleries.map(g => (
                <tr key={g.id} className="border-b border-neutral-100">
                  <td className="py-2 text-neutral-800">
                    <Link
                      href={`/admin/galleries/edit?id=${g.id}`}
                      className="hover:text-primary-600"
                    >
                      {g.title}
                    </Link>
                  </td>
                  <td className="py-2 text-right">
                    <span className="text-emerald-700 font-medium">{g.kanban!.doneCount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-300">
                <td className="py-2 font-semibold text-neutral-900">Total</td>
                <td className="py-2 text-right font-semibold text-emerald-700">{totalCompleted}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
