'use client';

import { Fragment, useState } from 'react';

interface InquiryListProps {
  inquiries: Array<Record<string, unknown>>;
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
}

export function InquiryList({ inquiries, onStatusChange, onDelete }: InquiryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (inquiries.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        No inquiries found.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-neutral-600">
              Name
            </th>
            <th className="text-left px-4 py-3 font-medium text-neutral-600">
              Email
            </th>
            <th className="text-left px-4 py-3 font-medium text-neutral-600">
              Type
            </th>
            <th className="text-left px-4 py-3 font-medium text-neutral-600">
              Status
            </th>
            <th className="text-left px-4 py-3 font-medium text-neutral-600">
              Date
            </th>
            <th className="text-right px-4 py-3 font-medium text-neutral-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {inquiries.map((inquiry) => {
            const id = inquiry.id as string;
            const status = inquiry.status as string;
            const isExpanded = expandedId === id;
            return (
              <Fragment key={id}>
                <tr
                  onClick={() => setExpandedId(isExpanded ? null : id)}
                  className="hover:bg-neutral-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {inquiry.name as string}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {inquiry.email as string}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 capitalize">
                    {(inquiry.sessionType as string) || 'general'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        status === 'new'
                          ? 'bg-green-100 text-green-700'
                          : status === 'replied'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(
                      inquiry.createdAt as string
                    ).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div
                      className="flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {status === 'new' && onStatusChange && (
                        <button
                          onClick={() => onStatusChange(id, 'read')}
                          className="text-xs px-2 py-1 rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                        >
                          Mark Read
                        </button>
                      )}
                      {status !== 'replied' && onStatusChange && (
                        <button
                          onClick={() => onStatusChange(id, 'replied')}
                          className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          Mark Replied
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(id)}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 bg-neutral-50">
                      <div className="space-y-2">
                        {inquiry.phone ? (
                          <p className="text-sm">
                            <span className="font-medium">Phone:</span>{' '}
                            {String(inquiry.phone)}
                          </p>
                        ) : null}
                        <p className="text-sm">
                          <span className="font-medium">Message:</span>
                        </p>
                        <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                          {inquiry.message as string}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
