const http = require('http');

http.get('http://localhost:3000/', (res) => {
  console.log('Status code:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response body preview:', data.substring(0, 200));
  });
}).on('error', (err) => {
  console.error('Error fetching page:', err.message);
});
