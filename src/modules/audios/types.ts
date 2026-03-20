export interface AudioFile {
  id: string;
  user_id: string;
  company_id: string | null;
  title: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}
