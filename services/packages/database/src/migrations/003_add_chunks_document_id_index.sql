-- Add index on document_id for faster lookups and joins
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
