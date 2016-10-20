
/**
 * Module dependencies.
 */

var express = require('express')
, widget = require('./routes/widget')
, http = require('http')
, cluster = require('cluster')
, http = require('http')
, numCPUs = require('os').cpus().length
, path = require('path');

var exec = require('child_process').exec;

var app = express();

app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

app.get('/widget/:type', widget.widget);

app.get('/github/webhook',function(req, res){
  var cmd = 'cd /var/www/fnil.net; /usr/bin/git pull';

  exec(cmd, function(error, stdout, stderr) {
    console.log('web hook executed with output: %s \n %s', stdout, stderr);
  });

});

if (cluster.isMaster) {
	// Fork workers.
	for (var i = 0; i < numCPUs; i++) {
		cluster.fork();
	}

	cluster.on('exit', function(worker, code, signal) {
		console.log('worker ' + worker.process.pid + ' died, restart it...');
		cluster.fork();
	});
} else {
	// Workers can share any TCP connection
	// In this case its a HTTP server
	http.createServer(app).listen(app.get('port'), function(){
		console.log("Express server listening on port " + app.get('port'));
	});
}
