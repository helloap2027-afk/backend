async function run() {
  const res = await fetch('http://localhost:4000/api/v1/search/businesses?city=hyderabad', {
    headers: {
      'Origin': 'http://localhost:8081',
      'If-None-Match': 'W/"2726-9WdH60on/mxhhXvpVo76zjUjWCQ"'
    }
  });

  console.log('HTTP Status:', res.status, res.statusText);
  console.log('Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'));
  console.log('Access-Control-Allow-Credentials:', res.headers.get('access-control-allow-credentials'));
  console.log('Cache-Control:', res.headers.get('cache-control'));
  console.log('ETag:', res.headers.get('etag'));

  const json = await res.json();
  console.log('JSON Success:', json.success);
  console.log('Businesses count returned:', json.data?.length);
  if (json.data?.length > 0) {
    console.log('First business sample:', {
      name: json.data[0].name,
      category: json.data[0].primaryCategory?.name
    });
  }
}

run().catch(console.error);
