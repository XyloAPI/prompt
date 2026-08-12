"use server";

import { trackDownload } from "@/lib/data";
import { revalidatePath } from "next/cache";

export async function incrementDownloadAction(id: string): Promise<{ success: boolean; downloads: number }> {
  try {
    const downloads = await trackDownload(id);
    revalidatePath(`/image/${id}`);
    revalidatePath("/gallery");
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true, downloads };
  } catch {
    return { success: false, downloads: 0 };
  }
}
