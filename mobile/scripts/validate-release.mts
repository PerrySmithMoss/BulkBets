const value = process.env.EXPO_PUBLIC_API_URL;
const url = value ? new URL(value) : null;
if (!url || url.protocol !== 'https:' || url.username || url.password || url.hostname === 'localhost') {
  throw new Error('Native releases require EXPO_PUBLIC_API_URL with a public HTTPS API URL.');
}
