const http = require('http');

function startServer() {
  const server = http.createServer((req, res) => {
    res.write("I'm alive");
    res.end();
  });

  server.listen(8080, () => {
    console.log('Keep-alive server is running on port 8080');
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    setTimeout(startServer, 5000); // Restart the server after 5 seconds on error
  });
}

startServer();
