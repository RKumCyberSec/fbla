import { supabase } from "@/lib/supabase";
import * as FileSystem from "expo-file-system/legacy";

export type DbUser = {
  id: string;
  clerk_user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
};

export function parseMediaUrls(mediaUrl: string | null | undefined): string[] {
  if (!mediaUrl) return [];

  const trimmed = mediaUrl.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      // ignore
    }
  }

  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function getOrCreateDbUser(clerkUser: {
  id: string;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}): Promise<DbUser | null> {
  const { data: existingUser, error: fetchError } = await supabase
    .from("users")
    .select("id, clerk_user_id, email, first_name, last_name, image_url")
    .eq("clerk_user_id", clerkUser.id)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching DB user:", fetchError);
    return null;
  }

  if (existingUser) return existingUser as DbUser;

  const payload = {
    clerk_user_id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
    first_name: clerkUser.firstName ?? null,
    last_name: clerkUser.lastName ?? null,
    image_url: clerkUser.imageUrl ?? null,
  };

  const { data: insertedUser, error: insertError } = await supabase
    .from("users")
    .insert(payload)
    .select("id, clerk_user_id, email, first_name, last_name, image_url")
    .single();

  if (insertError) {
    console.error("Error creating DB user:", insertError);
    return null;
  }

  return insertedUser as DbUser;
}

export function formatDisplayName(user?: {
  first_name?: string | null;
  last_name?: string | null;
}) {
  const name = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();
  return name || "User";
}

function getMimeTypeFromUri(uri: string) {
  const lower = uri.toLowerCase();

  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  return "image/jpeg";
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

export async function uploadImageToSupabase(uri: string, dbUserId: string) {
  const fileInfo = await FileSystem.getInfoAsync(uri);

  if (!fileInfo.exists) {
    throw new Error("Selected image file does not exist.");
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });

  const arrayBuffer = base64ToArrayBuffer(base64);

  const extension = uri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
  const fileName = `${dbUserId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;

  const contentType = getMimeTypeFromUri(uri);

  const { error: uploadError } = await supabase.storage
    .from("post-media")
    .upload(fileName, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Supabase upload error:", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from("post-media").getPublicUrl(fileName);

  return data.publicUrl;
}