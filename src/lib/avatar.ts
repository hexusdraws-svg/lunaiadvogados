import { supabase } from "@/integrations/supabase/client";

const AVATAR_BUCKET = "avatars";

export async function uploadAvatar(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `avatars/${crypto.randomUUID()}.${ext}`;
  console.log(
    "[uploadAvatar] bucket=" +
      AVATAR_BUCKET +
      " path=" +
      path +
      " file=" +
      file.name +
      " size=" +
      file.size +
      " type=" +
      file.type,
  );
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    console.error("[uploadAvatar] storage error:", error);
    throw error;
  }
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteAvatar(url: string): Promise<void> {
  try {
    const urlObj = new URL(url);
    const pathPart = urlObj.pathname.split("/");
    const bucketIndex = pathPart.indexOf(AVATAR_BUCKET);
    if (bucketIndex >= 0 && bucketIndex < pathPart.length - 1) {
      const fullPath = pathPart.slice(bucketIndex + 1).join("/");
      await supabase.storage.from(AVATAR_BUCKET).remove([fullPath]);
    }
  } catch (e) {
  }
}
