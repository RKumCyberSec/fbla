import { supabase } from "@/lib/supabase";
import * as FileSystem from "expo-file-system/legacy";

export type SelectedMusic = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  title: string;
  artist: string;
};

function getAudioMimeType(
  uri: string,
  mimeType?: string | null
): string {
  if (mimeType) return mimeType;

  const lower = uri.toLowerCase();

  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";

  return "audio/mpeg";
}

function getFileExtension(uri: string, fallbackMimeType?: string | null) {
  const raw = uri.split(".").pop()?.split("?")[0]?.toLowerCase();
  if (raw) return raw;

  if (fallbackMimeType === "audio/mp4") return "m4a";
  if (fallbackMimeType === "audio/wav") return "wav";
  if (fallbackMimeType === "audio/ogg") return "ogg";
  return "mp3";
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

export async function uploadMusicToSupabase(
  file: SelectedMusic,
  dbUserId: string
) {
  const fileInfo = await FileSystem.getInfoAsync(file.uri);

  if (!fileInfo.exists) {
    throw new Error("Selected audio file does not exist.");
  }

  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: "base64",
  });

  const arrayBuffer = base64ToArrayBuffer(base64);
  const contentType = getAudioMimeType(file.uri, file.mimeType);
  const extension = getFileExtension(file.uri, file.mimeType);

  const fileName = `${dbUserId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("post-audio")
    .upload(fileName, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Audio upload error:", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from("post-audio").getPublicUrl(fileName);

  return data.publicUrl;
}