/**
 * Compresses an image file from a user upload to a small Base64 string (~30-50KB).
 * Resizes to 400px wide and lowers quality to 0.6.
 */
export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const scale = MAX_WIDTH / img.width;
        
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Could not get canvas context');
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Export as low-quality JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        console.log(`[DEBUG] Image compressed. Original: ${img.width}x${img.height}, New: ${canvas.width}x${canvas.height}, DataURL length: ${dataUrl.length}`);
        resolve(dataUrl);
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};
