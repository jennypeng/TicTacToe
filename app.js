var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
// set up sockets to lissten to port 3000
var server = require('http').Server(app)
var io = require('socket.io')(server);
// list of games going on
var games = [];
// keeping track of players and what room they're in
var xPlayers = [];
var oPlayers = [];
// keeping count of players
var xPlayersCount = 0;
var oPlayersCount = 0;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

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
    console.log('connecting');
    joinGame(socket.id);
    /*if (userCount == 1) {
      playerX = socket.id;
    }
    if (userCount == 2) {
      playerO = socket.id;

      // end the waiting screen for all the players
      gameInProgress = true;
      io.to(playerX).emit('playersFound', {playerStart: true});
      io.to(playerO).emit('playersFound', {playerStart: false});
      // set up next turn
      isXTurn = false;
    }*/
    function leaveGame(id, dc) {
      console.log('xplayers contains: ' + !isNaN(xPlayers[id]));
      if (!isNaN(xPlayers[id])) { 
        console.log('deleting player X');
        var roomNum = xPlayers[id];
        var dcGame = games[roomNum];
        dcGame.playerX = null;
        xPlayersCount--;
        //dcGame.playerO = null;
        delete xPlayers[id];
        delete xPlayers[id];
        if (dc){
          //xPlayerCount++;
          //dcGame.playerX = dcGame.playerO;
          //dcGame.playerO = null;
          //xPlayers[dcGame.playerX] = roomNum;
          io.to(dcGame.playerO).emit('gameover', {winner: "O", disconnect: true});
          leaveGame(dcGame.playerO, false);
        }
        // set this room to free if no players in the room
        //if (!dcGame.playerO && !dcGame.playerX) dcGame.empty = true;
      } else { // if player O disconnects, remove playerO from the database
        console.log('dleeting player O');
        var dcGame = games[oPlayers[id]];
        if (dcGame) {
          //io.to(dcGame.playerX).emit('gameover', {winner: "X", disconnect: true});
          dcGame.playerO = null;
          if (dc) {

            console.log('player o dc sending mesg to x ' + dcGame.playerX);
            io.to(dcGame.playerX).emit('gameover', {winner: "X", disconnect: true});
            leaveGame(dcGame.playerX, false);
          }
          // set this room to free if no players in the room
          if (!dcGame.playerX) dcGame.empty = true;
        }
        console.log('subbing oplayers count from ' + id);
        oPlayersCount--;
        delete oPlayers[id]
    }
  };
  function joinGame(id) {
    console.log('xplyaers is ' + xPlayersCount);
    console.log('oplayers count is ' + oPlayersCount);
    var freeIndex;
    for (freeIndex = 0; freeIndex < games.length; freeIndex++) {
      var game = games[freeIndex];
      if (!game.playerX) {
        game.playerX = id;
        game.empty = false;
        xPlayersCount++;
        xPlayers[id] = freeIndex;
        console.log('found an empty X and filling');
        break;
      } 
      else if (!game.playerO) {
        game.playerO = id;
        game.empty = false;
        oPlayersCount++;
        oPlayers[id] = freeIndex;
        console.log('found an empty O and filling');
        break;
      }
    }
    console.log('freeIndex is ' + freeIndex);
    if (freeIndex == games.length) {
      games[freeIndex] = {playerX: id};
      games[freeIndex].empty = false;
      xPlayersCount++;
      xPlayers[id] = freeIndex;
    } 
    console.log('player O is ' + games[freeIndex].playerO);
    console.log('player X is ' + games[freeIndex].playerX);
    console.log('why mista');
    console.log('together they areAEFWEF ' + (games[freeIndex].playerO && games[freeIndex].playerX));
    if (games[freeIndex].playerO && games[freeIndex].playerX) {
      io.to(games[freeIndex].playerX).emit('playersFound', {playerStart: true, gameID: freeIndex});
      io.to(games[freeIndex].playerO).emit('playersFound', {playerStart: false, gameID: freeIndex});
      games[freeIndex].isXTurn = false;
    }

    /*if (xPlayersCount == oPlayersCount) { // 1 0  4

      // find the earliest free room
      var freeIndex = games.length;
      for (var i = 0; i < games.length; i++) {
        if (games[i].empty) freeIndex = i;
      }
      // make a new room with the newly connected player as playerX
      games[freeIndex] = {playerX: id};
      games[freeIndex].empty = false;
      xPlayersCount++;
      // keep track of which room this player belongs to
      xPlayers[id] = freeIndex; 
      console.log('xplyaers is now' + xPlayersCount);
      console.log('oplayers count is now' + oPlayersCount);
    } else {
      // find a game to fill with an o player
      for (var i = 0; i < games.length; i++) {
        if (!games[i].playerO) {
          games[i].playerO = id;
          oPlayers[id] = i;
          oPlayersCount++;
          console.log('xplyaers is now' + xPlayersCount);
          console.log('oplayers count is now' + oPlayersCount);
          // start the game
          io.to(games[i].playerX).emit('playersFound', {playerStart: true, gameID: i});
          io.to(games[i].playerO).emit('playersFound', {playerStart: false, gameID: i});
          games[i].isXTurn = false;
          break;
        }
      }    
  }*/
};

    socket.on('disconnect', function() {
      console.log('disconnecting ' + socket.id);
      leaveGame(socket.id, true);
    });
        /*if (playerX == socket.id) { // if player x disconnects, player o becomes player x
          if (gameInProgress) io.to(playerO).emit('gameover', {winner: "O", disconnect: true});
          playerX = playerO;
          playerO = null;

        } 
        if (playerO == socket.id) { // if playerO disconnects, we just disconnect them
          if (gameInProgress) io.to(playerX).emit('gameover', {winner: "X", disconnect: true});
          playerO = null;
        }
        gameInProgress = false;*/

    //

  //});

    // //handle request for listing of users
    socket.on('mouseover', function(data) {
      var game = games[data.gameID];
      io.to(game.playerX).emit('triggerhover', data);
      io.to(game.playerO).emit('triggerhover', data);
      //io.sockets.emit('triggerhover', data);
    });
    socket.on('mouseout', function(data) {
      var game = games[data.gameID];

      io.to(game.playerX).emit('removehover', data);
      io.to(game.playerO).emit('removehover', data);
      //io.sockets.emit('removehover', data);
    });
    socket.on('clickedsquare', function(data) {
      var game = games[data.gameID];
      io.to(game.playerX).emit('clicksquare', data);
      io.to(game.playerO).emit('clicksquare', data);
      //io.sockets.emit('clicksquare', data);
    });
    socket.on('joingame', function(data) {
      joinGame('/#' + data.id);
    })
    socket.on('endgame', function(data) {
      var game = games[data.gameID];

      io.to(game.playerX).emit('gameover', data);
      io.to(game.playerO).emit('gameover', data);
      //delete xPlayers[game.playerX];
      //delete oPlayers[game.playerO];
      leaveGame(game.playerX);
      leaveGame(game.playerO);
      //game.playerO = null;
      //game.playerX = null;
      //game.empty = true;
      //xPlayersCount--;
      //oPlayersCount--;

      /*gameInProgress = false;
      playerX = null;
      playerO = null;
      io.sockets.emit('gameover', data);*/
    });
    /*socket.on('replay', function(data) {
      var id = '/#' + data.player;
      if (playerX && id != playerX) { // if playerX already exists and this player isn't playerX
        playerO = id;
        gameInProgress = true;
        io.to(playerX).emit('playersFound', {playerStart: true});
        io.to(playerO).emit('playersFound', {playerStart: false});
        isXTurn = false;
      } else {
        playerX = id;
      }
    })*/

    // turn logic
    socket.on('nextturn', function(data) {
      var gameID = data.gameID;
      var game = games[gameID];
      var nextTurnPlayer = game.isXTurn? game.playerX : game.playerO; // get the id of the next player
      io.to(nextTurnPlayer).emit('playturn');
      game.isXTurn = !game.isXTurn; // switch turns
    });


  })


//module.exports = app;
server.listen(8080);
