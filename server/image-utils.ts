import sharp from 'sharp';

interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
}

interface CompressedImage {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Comprime una imagen para optimizar el tamaño de archivo
 * Ideal para subidas de fotos en dispositivos móviles
 */
export async function compressImage(
  inputBuffer: Buffer,
  options: ImageCompressionOptions = {}
): Promise<CompressedImage> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 80,
    format = 'jpeg'
  } = options;

  let sharpInstance = sharp(inputBuffer);
  
  // Obtener metadata de la imagen original
  const metadata = await sharpInstance.metadata();
  
  // Redimensionar si excede los límites
  if (metadata.width && metadata.height) {
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
  }

  // Aplicar formato y compresión
  let outputBuffer: Buffer;
  let mimeType: string;

  switch (format) {
    case 'webp':
      outputBuffer = await sharpInstance.webp({ quality }).toBuffer();
      mimeType = 'image/webp';
      break;
    case 'png':
      outputBuffer = await sharpInstance.png({ quality }).toBuffer();
      mimeType = 'image/png';
      break;
    case 'jpeg':
    default:
      outputBuffer = await sharpInstance.jpeg({ quality, mozjpeg: true }).toBuffer();
      mimeType = 'image/jpeg';
      break;
  }

  // Obtener dimensiones finales
  const outputMetadata = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    mimeType,
    width: outputMetadata.width || 0,
    height: outputMetadata.height || 0
  };
}

/**
 * Genera un thumbnail de una imagen
 * Ideal para vistas previas y listas
 */
export async function generateThumbnail(
  inputBuffer: Buffer,
  size: number = 300
): Promise<CompressedImage> {
  const sharpInstance = sharp(inputBuffer);
  
  const outputBuffer = await sharpInstance
    .resize(size, size, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 70, mozjpeg: true })
    .toBuffer();

  return {
    buffer: outputBuffer,
    mimeType: 'image/jpeg',
    width: size,
    height: size
  };
}

/**
 * Optimiza una imagen para móviles (menor calidad, menor tamaño)
 */
export async function optimizeForMobile(
  inputBuffer: Buffer
): Promise<CompressedImage> {
  return compressImage(inputBuffer, {
    maxWidth: 1280,
    maxHeight: 720,
    quality: 70,
    format: 'jpeg'
  });
}

/**
 * Optimiza una imagen para tablets (calidad media)
 */
export async function optimizeForTablet(
  inputBuffer: Buffer
): Promise<CompressedImage> {
  return compressImage(inputBuffer, {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 80,
    format: 'jpeg'
  });
}

/**
 * Verifica si un buffer es una imagen válida
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return !!metadata.format;
  } catch {
    return false;
  }
}

/**
 * Obtiene las dimensiones de una imagen
 */
export async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
    return null;
  } catch {
    return null;
  }
}
