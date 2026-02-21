// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shuffleArray } from '../../../lambda/shared/array';

describe('shuffleArray', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a new array without mutating the input', () => {
    const input = [1, 2, 3];
    const result = shuffleArray(input);
    expect(result).not.toBe(input);
    expect(input).toEqual([1, 2, 3]);
  });

  it('returns array with same length', () => {
    const input = ['a', 'b', 'c', 'd'];
    const result = shuffleArray(input);
    expect(result).toHaveLength(4);
  });

  it('returns array with same elements', () => {
    const input = [1, 2, 3];
    const result = shuffleArray(input);
    expect(result.sort()).toEqual([1, 2, 3]);
  });

  it('handles empty array', () => {
    const result = shuffleArray([]);
    expect(result).toEqual([]);
  });

  it('handles single element', () => {
    const result = shuffleArray([42]);
    expect(result).toEqual([42]);
  });

  it('produces different order with different random seed', () => {
    const input = [1, 2, 3, 4, 5];
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const result1 = shuffleArray(input);
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const result2 = shuffleArray(input);
    // With different random values, we expect different permutations
    expect(JSON.stringify(result1)).not.toEqual(JSON.stringify(result2));
  });
});
