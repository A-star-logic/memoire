-- Create Documents table with full-text search support
CREATE TABLE IF NOT EXISTS documents (
    content TEXT,
    content_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content, ''))) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metadata JSONB NOT NULL DEFAULT '{}',
    title TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_documents_content_vector ON documents USING GIN (content_vector);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents (title);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
