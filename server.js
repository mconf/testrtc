const express = require('express');
const path = require('path');
const app = express();

app.use('/testrtc', express.static(path.join(__dirname, 'out/src')));

app.listen(3010, function() {
  console.log('Live at Port 3010');
});
