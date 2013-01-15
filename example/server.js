var http = require('http');
var ecstatic = require('ecstatic');
var port = 8085;
var server = http.createServer(ecstatic(__dirname));
server.listen(port);
console.log('Server started on ' + port);
