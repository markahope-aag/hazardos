// Image compression constants
const MAX_IMAGE_WIDTH = 1920
const MAX_IMAGE_HEIGHT = 1920
const JPEG_QUALITY = 0.8
const MAX_FILE_SIZE_MB = 2

/**
 * Compress an image file using Canvas API.
 * Reduces dimensions and applies JPEG compression.
 */
export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Skip compression for non-image files
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const objectUrl = URL.createObjectURL(file)

    if (!ctx) {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to get canvas context'))
      return
    }

    img.onload = () => {
      // Cleanup object URL after image loads
      URL.revokeObjectURL(objectUrl)

      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img

      if (width > MAX_IMAGE_WIDTH) {
        height = (height * MAX_IMAGE_WIDTH) / width
        width = MAX_IMAGE_WIDTH
      }

      if (height > MAX_IMAGE_HEIGHT) {
        width = (width * MAX_IMAGE_HEIGHT) / height
        height = MAX_IMAGE_HEIGHT
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            // If still too large, try with lower quality
            if (blob.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
              canvas.toBlob(
                (smallerBlob) => {
                  resolve(smallerBlob || blob)
                },
                'image/jpeg',
                0.6
              )
            } else {
              resolve(blob)
            }
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}
