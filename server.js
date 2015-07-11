var unirest = require('unirest');
var express = require('express');
var events = require('events');

var getFromApi = function(endpoint, args) {
	var emitter = new events.EventEmitter();
	unirest.get('https://api.spotify.com/v1/' + endpoint)
		.qs(args).end(function(response) {
			emitter.emit('end', response.body);
		});
	return emitter;
};

var app = express();
app.use(express.static('public'));

app.get('/search/:name', function(req, res) {
  var searchReq = getFromApi('search', {
    q: req.params.name,
    limit: 1,
    type: 'artist'
  });

  searchReq.on('end', function(item) {
    var artist = item.artists.items[0];
    var id = artist.id;
    
    var relatedReq = getFromApi('artists/'+id+'/related-artists');
    relatedReq.on('end', function(item) {
    	artist.related = item.artists;
      var count = 0;
      var length = artist.related.length;
      artist.related.forEach(function(relArtist) {
        var trackReq = getFromApi('artists/'+relArtist.id+'/top-tracks', {
          country: 'US'
        });
        trackReq.on('end', function(item) {
          console.log(item);
          relArtist.tracks = item.tracks;
          count++
          if (count == length) {
            res.json(artist);
          }
        });
        trackReq.on('error', function() {
          res.sendStatus(404);
        });
      });
    });

    relatedReq.on('error', function() {
    	res.sendStatus(404);
    });
  });


  searchReq.on('error', function() {
    res.sendStatus(404);
  });
});

app.listen(8080);