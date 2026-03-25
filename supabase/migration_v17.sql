-- migration_v17: Storage bucket for course file uploads
-- Creates a public 'course-files' bucket and RLS policies so coaches can
-- upload files and clients/public can read them.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-files',
  'course-files',
  true,
  524288000, -- 500 MB per file
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/ogg',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Public read (clients access files by URL)
CREATE POLICY "course_files_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'course-files');

-- Authenticated coaches can upload
CREATE POLICY "course_files_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-files');

-- Authenticated coaches can update (overwrite)
CREATE POLICY "course_files_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'course-files');

-- Authenticated coaches can delete
CREATE POLICY "course_files_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'course-files');
