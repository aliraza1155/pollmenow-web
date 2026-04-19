// src/lib/location.js
export async function getCountryFromIP() {
  try {
    // Get IP first
    const ipRes = await fetch('https://api.ipify.org?format=json');
    const { ip } = await ipRes.json();
    // Use ip-api.com which supports CORS
    const res = await fetch(`https://ip-api.com/json/${ip}`);
    const data = await res.json();
    if (data.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        city: data.city
      };
    }
  } catch (err) {
    console.error('IP location error:', err);
  }
  return null;
}

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
            lng: longitude
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
  const gps = await getBrowserLocation();
  if (gps && gps.country) return gps;
  return await getCountryFromIP();
}