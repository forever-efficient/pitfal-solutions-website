'use client';

import { useState } from 'react';
import { clientGallery, ApiError } from '@/lib/api';

interface Comment {
  id: string;
  imageKey: string;
  author: string;
  text: string;
  createdAt: string;
}

interface ImageCommentProps {
  galleryId: string;
  imageKey: string;
  comments: Comment[];
  onCommentAdded: (comment: Comment) => void;
}

export function ImageComment({
  galleryId,
  imageKey,
  comments,
  onCommentAdded,
}: ImageCommentProps) {
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim() || !text.trim()) return;

    setLoading(true);
    setError('');

    try {
      const data = await clientGallery.addComment(
        galleryId,
        imageKey,
        author.trim(),
        text.trim()
      );
      onCommentAdded(data.comment);
      setText('');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to add comment'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <h4 className="text-sm font-medium text-neutral-700 mb-3">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h4>

      {/* Comment list */}
      <div className="space-y-3 mb-4">
        {comments.map((comment) => (
          <div key={comment.id} className="bg-neutral-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-neutral-900">
                {comment.author}
              </span>
              <time className="text-xs text-neutral-400">
                {new Date(comment.createdAt).toLocaleDateString()}
              </time>
            </div>
            <p className="text-sm text-neutral-700">{comment.text}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-neutral-400">No comments yet</p>
        )}
      </div>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name"
          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
          required
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
          required
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !author.trim() || !text.trim()}
          className="w-full bg-primary-600 text-white py-2 text-sm rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending...' : 'Add Comment'}
        </button>
      </form>
    </div>
  );
}
