'use client';

import { Fragment, useState } from 'react';

interface InquiryListProps {
  inquiries: Array<Record<string, unknown>>;
}

export function InquiryList({ inquiries }: InquiryListProps) {
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
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {inquiries.map((inquiry) => {
            const id = inquiry.id as string;
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
                        inquiry.status === 'new'
                          ? 'bg-green-100 text-green-700'
                          : inquiry.status === 'replied'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {inquiry.status as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(
                      inquiry.createdAt as string
                    ).toLocaleDateString()}
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 bg-neutral-50">
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
