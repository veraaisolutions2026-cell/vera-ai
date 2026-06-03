BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'kb_file_scope'
  ) THEN
    CREATE TYPE public.kb_file_scope AS ENUM ('admin', 'user');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'kb_file_link_status'
  ) THEN
    CREATE TYPE public.kb_file_link_status AS ENUM ('unlinked', 'linked-to-agent');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.knowledge_base_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploaded_by_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope public.kb_file_scope NOT NULL DEFAULT 'user',
  link_status public.kb_file_link_status NOT NULL DEFAULT 'unlinked',
  name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  bucket text NOT NULL DEFAULT 'knowledge-base-files',
  storage_path text NOT NULL UNIQUE,
  summary_text text,
  summary_model text,
  summary_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_base_files_owner_scope_check CHECK (
    (scope = 'admin' AND owner_user_id IS NULL)
    OR (scope = 'user' AND owner_user_id IS NOT NULL)
  ),
  CONSTRAINT knowledge_base_files_pdf_mime_check CHECK (mime_type = 'application/pdf'),
  CONSTRAINT knowledge_base_files_bucket_check CHECK (bucket = 'knowledge-base-files'),
  CONSTRAINT knowledge_base_files_storage_pdf_check CHECK (lower(storage_path) LIKE '%.pdf')
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_files_owner ON public.knowledge_base_files(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_files_scope ON public.knowledge_base_files(scope);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_files_link_status ON public.knowledge_base_files(link_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_files_created_at ON public.knowledge_base_files(created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_knowledge_base_files (
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.knowledge_base_files(id) ON DELETE CASCADE,
  linked_by_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_kb_files_file_id ON public.agent_knowledge_base_files(file_id);
CREATE INDEX IF NOT EXISTS idx_agent_kb_files_created_at ON public.agent_knowledge_base_files(created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_knowledge_base_files_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_knowledge_base_files_updated_at ON public.knowledge_base_files;
CREATE TRIGGER trg_touch_knowledge_base_files_updated_at
BEFORE UPDATE ON public.knowledge_base_files
FOR EACH ROW
EXECUTE FUNCTION public.touch_knowledge_base_files_updated_at();

CREATE OR REPLACE FUNCTION public.sync_kb_file_link_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_file_id uuid;
BEGIN
  target_file_id := COALESCE(NEW.file_id, OLD.file_id);

  UPDATE public.knowledge_base_files
  SET link_status = CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.agent_knowledge_base_files akf
      WHERE akf.file_id = target_file_id
    ) THEN 'linked-to-agent'::public.kb_file_link_status
    ELSE 'unlinked'::public.kb_file_link_status
  END
  WHERE id = target_file_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kb_file_link_status_insert ON public.agent_knowledge_base_files;
CREATE TRIGGER trg_sync_kb_file_link_status_insert
AFTER INSERT ON public.agent_knowledge_base_files
FOR EACH ROW
EXECUTE FUNCTION public.sync_kb_file_link_status();

DROP TRIGGER IF EXISTS trg_sync_kb_file_link_status_delete ON public.agent_knowledge_base_files;
CREATE TRIGGER trg_sync_kb_file_link_status_delete
AFTER DELETE ON public.agent_knowledge_base_files
FOR EACH ROW
EXECUTE FUNCTION public.sync_kb_file_link_status();

ALTER TABLE public.knowledge_base_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_knowledge_base_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access knowledge base files" ON public.knowledge_base_files;
CREATE POLICY "Admin full access knowledge base files"
ON public.knowledge_base_files
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users read own knowledge base files" ON public.knowledge_base_files;
CREATE POLICY "Users read own knowledge base files"
ON public.knowledge_base_files
FOR SELECT
TO authenticated
USING (
  scope = 'user'::public.kb_file_scope
  AND owner_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users insert own knowledge base files" ON public.knowledge_base_files;
CREATE POLICY "Users insert own knowledge base files"
ON public.knowledge_base_files
FOR INSERT
TO authenticated
WITH CHECK (
  scope = 'user'::public.kb_file_scope
  AND owner_user_id = auth.uid()
  AND uploaded_by_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users update own knowledge base files" ON public.knowledge_base_files;
CREATE POLICY "Users update own knowledge base files"
ON public.knowledge_base_files
FOR UPDATE
TO authenticated
USING (
  scope = 'user'::public.kb_file_scope
  AND owner_user_id = auth.uid()
)
WITH CHECK (
  scope = 'user'::public.kb_file_scope
  AND owner_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users delete own knowledge base files" ON public.knowledge_base_files;
CREATE POLICY "Users delete own knowledge base files"
ON public.knowledge_base_files
FOR DELETE
TO authenticated
USING (
  scope = 'user'::public.kb_file_scope
  AND owner_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Admin full access agent knowledge base links" ON public.agent_knowledge_base_files;
CREATE POLICY "Admin full access agent knowledge base links"
ON public.agent_knowledge_base_files
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users manage own agent knowledge base links" ON public.agent_knowledge_base_files;
CREATE POLICY "Users manage own agent knowledge base links"
ON public.agent_knowledge_base_files
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.agents a
    JOIN public.knowledge_base_files kbf ON kbf.id = agent_knowledge_base_files.file_id
    WHERE a.id = agent_knowledge_base_files.agent_id
      AND a.user_id = auth.uid()
      AND a.is_builtin = false
      AND kbf.scope = 'user'::public.kb_file_scope
      AND kbf.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.agents a
    JOIN public.knowledge_base_files kbf ON kbf.id = agent_knowledge_base_files.file_id
    WHERE a.id = agent_knowledge_base_files.agent_id
      AND a.user_id = auth.uid()
      AND a.is_builtin = false
      AND kbf.scope = 'user'::public.kb_file_scope
      AND kbf.owner_user_id = auth.uid()
      AND linked_by_user_id = auth.uid()
  )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-base-files',
  'knowledge-base-files',
  false,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload own knowledge base files" ON storage.objects;
CREATE POLICY "Users upload own knowledge base files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-base-files'
  AND (storage.foldername(name))[1] = 'user'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users delete own knowledge base files" ON storage.objects;
CREATE POLICY "Users delete own knowledge base files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'knowledge-base-files'
  AND (storage.foldername(name))[1] = 'user'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Admins upload admin knowledge base files" ON storage.objects;
CREATE POLICY "Admins upload admin knowledge base files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-base-files'
  AND (storage.foldername(name))[1] = 'admin'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins delete knowledge base files" ON storage.objects;
CREATE POLICY "Admins delete knowledge base files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'knowledge-base-files'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

UPDATE public.knowledge_base_files kbf
SET link_status = CASE
  WHEN EXISTS (
    SELECT 1
    FROM public.agent_knowledge_base_files akf
    WHERE akf.file_id = kbf.id
  ) THEN 'linked-to-agent'::public.kb_file_link_status
  ELSE 'unlinked'::public.kb_file_link_status
END;

COMMIT;
