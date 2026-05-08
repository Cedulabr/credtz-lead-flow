import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'time-clock-photos';

/**
 * Resolves a `photo_url` value (which may be a full public URL from old records
 * or a relative storage path from new records) into a signed URL that works
 * with the now-private `time-clock-photos` bucket.
 */
export async function resolveTimeClockPhotoUrl(
  photoUrl: string | null | undefined
): Promise<string | null> {
  if (!photoUrl) return null;

  let path = photoUrl;

  // Strip prefixes from legacy full URLs:
  //   .../storage/v1/object/public/time-clock-photos/<path>
  //   .../storage/v1/object/sign/time-clock-photos/<path>?token=...
  const marker = `/${BUCKET}/`;
  const idx = photoUrl.indexOf(marker);
  if (idx !== -1) {
    path = photoUrl.substring(idx + marker.length).split('?')[0];
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    console.error('Failed to sign time-clock photo URL', error, photoUrl);
    return null;
  }
  return data.signedUrl;
}
