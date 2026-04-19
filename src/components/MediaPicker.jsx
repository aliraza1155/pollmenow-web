// src/components/MediaPicker.jsx
import { useState } from 'react';
import { uploadToFirebaseStorage } from '../lib/upload';

export default function MediaPicker({ onPicked, currentImage = null, aspect = [4,3] }) {
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState(currentImage);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToFirebaseStorage(file, 'poll-media');
      setImage(url);
      onPicked(url);
    } catch (err) {
      console.error(err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-200">
        <span>{image ? 'Change Image' : 'Add Image'}</span>
        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </label>
      {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
      {image && <img src={image} alt="preview" className="mt-2 rounded-lg max-h-48 object-cover" />}
    </div>
  );
}