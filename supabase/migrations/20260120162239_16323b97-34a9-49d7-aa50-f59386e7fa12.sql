-- Add origin column to track where document was uploaded from
ALTER TABLE client_documents 
ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'documentos';

-- Add comment for documentation
COMMENT ON COLUMN client_documents.origin IS 'Origin of document upload: documentos, televendas, meus_clientes';