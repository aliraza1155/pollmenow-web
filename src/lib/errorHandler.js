// src/lib/errorHandler.js
export class ErrorHandler {
  static handleFirebaseError(error, context) {
    console.error(`${context} error:`, error);
    if (error.code) {
      switch (error.code) {
        case 'permission-denied': return 'You do not have permission.';
        case 'not-found': return 'Resource not found.';
        case 'unavailable': return 'Network error. Check your connection.';
        default: return `Error while ${context}. Please try again.`;
      }
    }
    return `Failed to ${context}. Please try again.`;
  }

  static handleAIGenerationError(error) {
    console.error('AI error:', error);
    return 'AI service unavailable. Please try later.';
  }

  static handleImageUploadError(error) {
    console.error('Upload error:', error);
    if (error.message?.includes('file size')) return 'File too large.';
    if (error.message?.includes('format')) return 'Unsupported format.';
    return 'Failed to upload image.';
  }
}