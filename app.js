// set up the app
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');

var app = express();

// set up sockets to lissten to port 8080
var server = require('http').Server(app)
var io = require('socket.io')(server);

// list of games going on
var games = [];

// keeping track of players and what room they're in and type, ex: players[socket.id] = {type: "X", gameID: 3}
var players = [];

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

/*********** SOCKET LOGIC FOR TICTACTTOE *********/
io.sockets.on('connection', function (socket) {
  joinGame(socket.id);

  /* Function to let the player with id leave a game. If dc is true, this was a disconnect in the middle of a game. */
  function leaveGame(id, dc) {
    if (!players[id]) return; // if this room doesn't exist, just return

    var dcGame = games[players[id].gameID];

    if (players[id].type == 'X') {  // if this was an X player
      dcGame.playerX = null;
      delete players[id];
      // if this was a disconnect, force the other player to leave the game also if they haven't already
      if (dc && dcGame.playerO != null){ 
        io.to(dcGame.playerO).emit('gameover', {winner: "DC"});
        leaveGame(dcGame.playerO, false);
      }
    } else { 
      dcGame.playerO = null;
      delete players[id]
      if (dc && dcGame.playerX != null) {
        io.to(dcGame.playerX).emit('gameover', {winner: "DC"});
        leaveGame(dcGame.playerX, false);
      } 
    }
  };

  /* Function to let the player with id join a game. Finds the room with the first free space, or creates a new one. */
  function joinGame(id) {
    var freeIndex;
    // find a room with a missing player
    for (freeIndex = 0; freeIndex < games.length; freeIndex++) {
      var game = games[freeIndex];
      if (!game.playerX) { // fill in as a x player
        game.playerX = id;
        players[id] = {gameID: freeIndex, type: 'X'};
        break;
      } 
      else if (!game.playerO) { // fill in as a o player
        game.playerO = id;
        players[id] = {gameID: freeIndex, type: 'O'};
        break;
      }
    }
    if (freeIndex == games.length) { // if we had to make a new game, auto fill in as x
      games[freeIndex] = {playerX: id};
      games[freeIndex].empty = false;
      players[id] = {gameID: freeIndex, type: 'X'};
    } 
    if (games[freeIndex].playerO && games[freeIndex].playerX) { // if both players full, start a game
      io.to(games[freeIndex].playerX).emit('playersFound', {playerStart: true, gameID: freeIndex});
      io.to(games[freeIndex].playerO).emit('playersFound', {playerStart: false, gameID: freeIndex});
      games[freeIndex].isXTurn = false;
    }
  };

  // if a socket disconnects, we leave the game
  socket.on('disconnect', function() {
    leaveGame(socket.id, true);
  });

  // listen to players' mouseover events and send to their opponent 
  socket.on('mouseover', function(data) {
    var game = games[data.gameID];
    io.to(game.playerX).emit('triggerhover', data);
    io.to(game.playerO).emit('triggerhover', data);
  });

  // listen to players' mouseout events and send to their opponent
  socket.on('mouseout', function(data) {
    var game = games[data.gameID];
    io.to(game.playerX).emit('removehover', data);
    io.to(game.playerO).emit('removehover', data);
  });

  // record clicks from players and send to their opponent
  socket.on('clickedsquare', function(data) {
    var game = games[data.gameID];
    io.to(game.playerX).emit('clicksquare', data);
    io.to(game.playerO).emit('clicksquare', data);
  });

  // listen to players' requests to join in a game (pressing the replay button)
  socket.on('joingame', function(data) {
    joinGame('/#' + data.id);
  })

  // listen to gameover requests
  socket.on('endgame', function(data) {
    var game = games[data.gameID];
    io.to(game.playerX).emit('gameover', data);
    io.to(game.playerO).emit('gameover', data);
    leaveGame(game.playerX, false);
    leaveGame(game.playerO, false);
  });

  // switch turns
  socket.on('nextturn', function(data) {
    var gameID = data.gameID;
    var game = games[gameID];
    var nextTurnPlayer = game.isXTurn? game.playerX : game.playerO; // get the id of the next player
    io.to(nextTurnPlayer).emit('playturn');
    game.isXTurn = !game.isXTurn; // switch turns
  });
})

server.listen(8080);
