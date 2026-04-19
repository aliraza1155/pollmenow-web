// src/lib/cloudinary.js
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadToCloudinary(uri, folder = 'pollpoint', type = 'image') {
  // For web, uri is a blob URL or data URL – we need to convert to file/blob
  const response = await fetch(uri);
  const blob = await response.blob();
  const extension = blob.type.split('/')[1] || 'jpg';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${extension}`;
  const storagePath = `${folder}/${fileName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob);
  const downloadUrl = await getDownloadURL(storageRef);
  return {
    secure_url: downloadUrl,
    public_id: storagePath,
    width: 0,
    height: 0,
    format: extension,
    resource_type: type,
  };
}