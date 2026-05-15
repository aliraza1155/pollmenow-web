// src/lib/location.js
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const getCountryFromIPCallable = httpsCallable(functions, 'getCountryFromIP');

export async function getCountryFromIP() {
  try {
    const result = await getCountryFromIPCallable();
    return result.data; // { country, countryCode, city }
  } catch (err) {
    console.error('Cloud function geolocation failed:', err);
    return null;
  }
}

// Keep browser geolocation (GPS) as before – this runs first if user allows
export async function getBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          resolve({
            country: data.address?.country,
            city: data.address?.city,
            lat: latitude,
            lng: longitude,
          });
        } catch {
          resolve(null);
        }
      },
      () => resolve(null)
    );
  });
}

export async function detectLocation() {
  // Primary: GPS (user‑allowed)
  const gps = await getBrowserLocation();
  if (gps && gps.country) return gps;
  // Fallback: IP geolocation via cloud function
  return await getCountryFromIP();
}