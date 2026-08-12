import Compressor from "compressorjs";

export interface CompressionOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  mimeType?: string;
  convertSize?: number;
}

export function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  return new Promise((resolve, reject) => {
    const {
      quality = 0.82,
      maxWidth = 1920,
      maxHeight = 1920,
      mimeType = "image/jpeg",
      convertSize = 500000,
    } = options;

    new Compressor(file, {
      quality,
      maxWidth,
      maxHeight,
      mimeType,
      convertSize,
      success(result: Blob | File) {
        const ext = result.type === "image/png" ? ".png" : result.type === "image/webp" ? ".webp" : ".jpg";
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const compressedFile = new File(
          [result],
          `${baseName}_preview${ext}`,
          {
            type: result.type || "image/jpeg",
            lastModified: Date.now(),
          }
        );
        resolve(compressedFile);
      },
      error(err) {
        reject(err);
      },
    });
  });
}
