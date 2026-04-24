import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from './logger';

// Get Supabase URL and anon key from config or construct from database URL
const getSupabaseConfig = () => {
  // Extract project ref from database URL
  // Format: postgresql://postgres.{project_ref}:password@...
  const dbUrl = config.database.url;
  const match = dbUrl.match(/postgres\.([a-z0-9]+):/);

  if (!match) {
    logger.warn('Could not extract Supabase project ref from DATABASE_URL');
    return null;
  }

  const projectRef = match[1];
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseKey) {
    logger.warn('SUPABASE_ANON_KEY not set - image upload will not work');
    return null;
  }

  return { supabaseUrl, supabaseKey };
};

let supabaseClient: ReturnType<typeof createClient> | null = null;

export const getSupabase = () => {
  if (supabaseClient) return supabaseClient;

  const config = getSupabaseConfig();
  if (!config) return null;

  supabaseClient = createClient(config.supabaseUrl, config.supabaseKey);
  return supabaseClient;
};

// Storage bucket name for needle images
export const NEEDLE_IMAGES_BUCKET = 'needle-images';

/**
 * Upload an image to Supabase storage
 */
export const uploadImage = async (
  bucket: string,
  path: string,
  file: Buffer,
  contentType: string
): Promise<string | null> => {
  const supabase = getSupabase();
  if (!supabase) {
    logger.error('Supabase client not configured');
    return null;
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      logger.error('Supabase upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    logger.error('Error uploading to Supabase:', err);
    return null;
  }
};

/**
 * Delete an image from Supabase storage
 */
export const deleteImage = async (bucket: string, path: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      logger.error('Supabase delete error:', error);
      return false;
    }
    return true;
  } catch (err) {
    logger.error('Error deleting from Supabase:', err);
    return false;
  }
};

/**
 * Generate a unique barcode for needle types
 * Format: NL-XXXX-YYYYYY where XXXX is the code number and YYYYYY is a random alphanumeric
 */
export const generateNeedleBarcode = (code: string): string => {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${code}-${randomPart}`;
};
