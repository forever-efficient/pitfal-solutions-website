'use client';

import { useState } from 'react';
import type { BlogPostMeta } from '@/lib/blog';
import { BlogCard } from './BlogCard';

interface BlogCategoryFilterProps {
  posts: BlogPostMeta[];
  categories: { slug: string; label: string; count: number }[];
}

export function BlogCategoryFilter({ posts, categories }: BlogCategoryFilterProps) {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredPosts = activeCategory === 'all'
    ? posts
    : posts.filter(post => post.category === activeCategory);

  return (
    <>
      {/* Category tabs */}
      <nav aria-label="Blog categories" className="mb-10">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                activeCategory === cat.slug
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
              }`}
              aria-pressed={activeCategory === cat.slug}
            >
              {cat.label}
              <span className="ml-1.5 text-xs opacity-70">({cat.count})</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Posts grid */}
      {filteredPosts.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <BlogCard key={post.slug} {...post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-neutral-500 text-lg">No posts in this category yet.</p>
          <button
            onClick={() => setActiveCategory('all')}
            className="mt-4 text-primary-700 hover:text-primary-800 font-medium text-sm"
          >
            View all posts
          </button>
        </div>
      )}
    </>
  );
}
