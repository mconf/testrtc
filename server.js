const express = require('express');
const path = require('path');
const app = express();

app.use('/testrtc', express.static(path.join(__dirname, 'out/src')));

app.get('/', function(req, res) {
  res.sendFile('index.html');
})

app.get('/main.js', function(req, res) {
  res.sendFile('main.js');
});

app.get('/favicon.ico', function(req, res) {
  res.sendFile('images/favicon.ico');
});

app.listen(3010, function() {
  console.log('Live at Port 3010');
});
