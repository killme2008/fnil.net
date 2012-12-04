var http = require('http');
var feedparser = require('feedparser')
var client = http.createClient(80, 'wiki.fnil.net');

function requestWikiUpdates(callback){
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
					callback(matched[0]);
				}else{
					callback("No updates.");
				}
			}
		});
	});
}

function requestBlogPosts(callback){
	feedparser.parseUrl('http://blog.fnil.net/index.php/feed',function(error, meta, articles){
		if(error || articles == null || articles.length == 0){
			if(callback){
				callback("No posts");
			}
			return;
		}
		var rt="<ul>";
		articles.forEach(function(article){
			rt += "<li><a href='"+article.link+"'>"+article.title+"</a></li>";
		});
		rt += "</ul>";
		if(callback){
			callback(rt);
		}
	});
}

exports.widget = function(req,res){
	var type = req.query.type;
	try{
		switch(type){
		case "blog":
			requestBlogPosts(function(result){
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