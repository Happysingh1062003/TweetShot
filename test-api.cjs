const https = require('https');

https.get('https://tweet-shot.vercel.app/api/health', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('DATA:', data);
  });
}).on('error', (e) => {
  console.error(e);
});
