'use strict';
 
var express = require('express');
var path = require('path');
var responseTime = require('response-time');
var app = express();
app.use(responseTime());

app.use(express.static(path.join(__dirname, '')));

var scale = require('express-sharp');
 
var options = {baseHost: 'localhost:3000'};
app.use('/image-process', scale(options));
 
app.listen(3000, function () {
  console.log('App is listening on port 3000!');
});
