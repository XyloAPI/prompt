const targetUrl = 'https://prompt-7g4.pages.dev/assets/_next/static/css/3889f6368848e688.css';

fetch(targetUrl).then(res => {
  console.log(`With /assets prefix: ${targetUrl} -> Status: ${res.status}`);
});
