import { describe, it, expect } from 'vitest';
import { storage } from '../server/storage';

describe('Cursor-Based Pagination (DEFECT-5)', () => {
  it('should paginate patients using limit and cursor', async () => {
    // 1. Fetch first page with limit=2
    const page1 = await storage.getPatientsPaginated(undefined, 2);
    expect(page1).toBeDefined();
    expect(page1.items).toBeInstanceOf(Array);
    expect(page1.items.length).toBeLessThanOrEqual(2);

    if (page1.items.length === 2 && page1.hasMore) {
      expect(page1.nextCursor).toBeDefined();
      expect(typeof page1.nextCursor).toBe('string');

      // 2. Fetch second page using nextCursor
      const page2 = await storage.getPatientsPaginated(page1.nextCursor!, 2);
      expect(page2.items).toBeInstanceOf(Array);
      // Items on page 2 should not overlap with page 1
      const page1Ids = page1.items.map(p => p.id);
      for (const item of page2.items) {
        expect(page1Ids).not.toContain(item.id);
      }
    }
  });

  it('should paginate scans using limit and cursor', async () => {
    // 1. Fetch first page with limit=2
    const page1 = await storage.getScansPaginated(undefined, 2);
    expect(page1).toBeDefined();
    expect(page1.items).toBeInstanceOf(Array);
    expect(page1.items.length).toBeLessThanOrEqual(2);

    if (page1.items.length === 2 && page1.hasMore) {
      expect(page1.nextCursor).toBeDefined();
      expect(typeof page1.nextCursor).toBe('string');

      // 2. Fetch second page using nextCursor
      const page2 = await storage.getScansPaginated(page1.nextCursor!, 2);
      expect(page2.items).toBeInstanceOf(Array);
      const page1Ids = page1.items.map(s => s.id);
      for (const item of page2.items) {
        expect(page1Ids).not.toContain(item.id);
      }
    }
  });

  it('should return hasMore=false and nextCursor=null when all items are fetched', async () => {
    const hugePage = await storage.getPatientsPaginated(undefined, 1000);
    expect(hugePage.hasMore).toBe(false);
    expect(hugePage.nextCursor).toBeNull();
  });
});
