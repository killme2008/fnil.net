var http = require('http');
var feedparser = require('feedparser');
var client = http.createClient(80, 'wiki.fnil.net');
var memcache = require('memcache');
var memcached = new memcache.Client(process.env['memcached_port'] || 11211, process.env['memcached_servers'] || 'localhost');
memcached.connect();

memcached.on('error', function(e){
	if(e) console.log("Exception happend in memcached client:"+e);
	memcached.connect();
});

var WIKI_UPDATES = 'fnil_net_wiki_updates';
var BLOG_POSTS = 'fnil_net_blog_posts';
var GITHUB_ACTIVITY='fnil_github_activity'
var LIMIT = 6;

function requestWikiUpdates(callback){
	memcached.get(WIKI_UPDATES, function(err, result){
		if(err || result == null){
			if(err) console.log(err);
			var request = client.request('GET', '/index.php?title=%E6%A8%A1%E6%9D%BF:%E6%9C%80%E8%BF%91%E6%9B%B4%E6%96%B0');
			request.end();
			request.on('response', function (response) {
				response.setEncoding('utf8');
				var result = "";
				response.on('data', function (chunk) {
					result += chunk;
				});
				response.on('end', function() {
					if(callback){
						var matched = result.match(/<div id="mw-content-text"(.|\n)+?<\/div>/);
						if(matched){
							//cache 20 minutes.
							memcached.set(WIKI_UPDATES, matched[0], function(err, result){
								if(err) console.log(err);
							} , 1200);
							callback(matched[0]);
						}else{
							callback("No updates.");
						}
					}
				});
			});
		}else{
			if(callback) callback(result);
		}
	});
}

function requestFeed(key, src, callback){
	memcached.get(key, function(err,result){
		if(err || result == null){
			if(err) console.log(err);
			feedparser.parseUrl(src,function(error, meta, articles){
				if(error || articles == null || articles.length == 0){
					if(callback){
						callback("No posts");
					}
					return;
				}
				var rt="<ul>";
				articles = articles.slice(0,LIMIT);
				articles.forEach(function(article){
					rt += "<li><a href='"+article.link+"'>"+article.title+"</a></li>";
				});
				rt += "</ul>";
				//cache 20 minutes.
				memcached.set(key,rt,function(err,result){
					if(err) console.log(err);
				},1200);
				if(callback){
					callback(rt);
				}
			});
		}else{
			if(callback) callback(result);
		}
	});
}

exports.widget = function(req,res){
	var type = req.query.type;
	try{
		switch(type){
		case "blog":
			requestFeed(BLOG_POSTS,'http://blog.fnil.net/index.php/feed', function(result){
				res.send(result);
			});
			break;
		case "github":
			requestFeed(GITHUB_ACTIVITY,'https://github.com/killme2008.atom', function(result){
				res.send(result);
			});
			break;
		case "wiki":
			requestWikiUpdates(function(result){
				res.send(result);
			});
			break;
		}
	}catch(e){
		console.log(e);
		res.send("Error occurred");
	}
}