// Import environment setup before anything else
import './setup-test-env.js';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../utils/database.js';

describe('Database Connection and Schema Tests', () => {
  beforeAll(async () => {
    // Wait a bit to ensure connection is established
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await db.end();
  });

  it('should successfully connect to the database', async () => {
    const testQuery = 'SELECT 1 as result';
    const result = await db.query<{ result: number }>(testQuery);
    expect(result[0].result).toBe(1);
  });

  describe('Documents Table', () => {
    it('should have documents table with correct schema', async () => {
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'documents'
        );
      `;
      const result = await db.query<{ exists: boolean }>(tableExistsQuery);
      expect(result[0].exists).toBe(true);

      // Check columns and their types
      const columnsQuery = `
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'documents';
      `;
      const columns = await db.query<{ column_name: string; data_type: string; udt_name: string }>(columnsQuery);
      
      // Define expected columns based on memory
      const expectedColumns = new Map([
        ['document_id', { type: 'uuid' }],
        ['title', { type: 'text' }],
        ['metadata', { type: 'jsonb' }],
        ['created_at', { type: 'timestamp without time zone' }],
        ['updated_at', { type: 'timestamp without time zone' }]
      ]);

      // Verify all expected columns exist with correct types
      for (const [columnName, expected] of expectedColumns) {
        const column = columns.find(c => c.column_name === columnName);
        expect(column, `Column ${columnName} should exist`).toBeTruthy();
        
        // Special handling for timestamp types which can vary in PostgreSQL
        if (expected.type.includes('timestamp')) {
          expect(
            column?.data_type.includes('timestamp'),
            `Column ${columnName} should be a timestamp type`
          ).toBe(true);
        } else {
          expect(
            column?.data_type === expected.type || column?.udt_name === expected.type,
            `Column ${columnName} should be of type ${expected.type}`
          ).toBe(true);
        }
      }
    });
  });

  describe('Chunks Table', () => {
    it('should have chunks table with correct schema', async () => {
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'chunks'
        );
      `;
      const result = await db.query<{ exists: boolean }>(tableExistsQuery);
      expect(result[0].exists).toBe(true);

      // Check columns and their types
      const columnsQuery = `
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'chunks';
      `;
      const columns = await db.query<{ column_name: string; data_type: string; udt_name: string }>(columnsQuery);
      
      // Define expected columns based on memory
      const expectedColumns = new Map([
        ['id', { type: 'uuid' }],
        ['document_id', { type: 'uuid' }],
        ['chunk_content', { type: 'text' }],
        ['created_at', { type: 'timestamp without time zone' }],
        ['updated_at', { type: 'timestamp without time zone' }]
      ]);

      // Verify all expected columns exist with correct types
      for (const [columnName, expected] of expectedColumns) {
        const column = columns.find(c => c.column_name === columnName);
        expect(column, `Column ${columnName} should exist`).toBeTruthy();
        
        // Special handling for timestamp types which can vary in PostgreSQL
        if (expected.type.includes('timestamp')) {
          expect(
            column?.data_type.includes('timestamp'),
            `Column ${columnName} should be a timestamp type`
          ).toBe(true);
        } else {
          expect(
            column?.data_type === expected.type || column?.udt_name === expected.type,
            `Column ${columnName} should be of type ${expected.type}`
          ).toBe(true);
        }
      }
    });

    it('should have foreign key relationship with documents table', async () => {
      const fkQuery = `
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'chunks';
      `;
      
      const fkResult = await db.query<{
        constraint_name: string;
        column_name: string;
        foreign_table_name: string;
        foreign_column_name: string;
        delete_rule: string;
      }>(fkQuery);

      // Verify foreign key exists and points to documents table
      expect(fkResult.length).toBeGreaterThan(0);
      const fk = fkResult[0];
      expect(fk.column_name).toBe('document_id');
      expect(fk.foreign_table_name).toBe('documents');
      expect(fk.foreign_column_name).toBe('document_id');
      expect(fk.delete_rule).toBe('CASCADE');
    });

    it('should have B-tree index on document_id', async () => {
      const indexQuery = `
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = 'chunks'
            AND indexdef LIKE '%USING btree%document_id%'
        );
      `;
      const result = await db.query<{ exists: boolean }>(indexQuery);
      expect(result[0].exists).toBe(true);
    });
  });
});
