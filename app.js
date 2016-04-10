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

// set up user logic
var userCount = 0;
var playerO = null;
var playerX = null;
var isXTurn = true;
var gameInProgress = false;
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
    console.log("connected: " + socket.id.substring(2));
    userCount ++;
    if (userCount == 1) {
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
    }
    socket.on('disconnect', function() {

        userCount --;
        if (playerX == socket.id) { // if player x disconnects, player o becomes player x
          if (gameInProgress) io.to(playerO).emit('gameover', {winner: "O", disconnect: true});
          playerX = playerO;
          playerO = null;

        } 
        if (playerO == socket.id) { // if playerO disconnects, we just disconnect them
          if (gameInProgress) io.to(playerX).emit('gameover', {winner: "X", disconnect: true});
          playerO = null;
        }
        gameInProgress = false;

    });

    // //handle request for listing of users
    socket.on('mouseover', function(data) {
      io.sockets.emit('triggerhover', data);
    });
    socket.on('mouseout', function(data) {
      io.sockets.emit('removehover', data);
    });
    socket.on('clickedsquare', function(data) {
      io.sockets.emit('clicksquare', data);
    });
    socket.on('endgame', function(data) {
      gameInProgress = false;
      playerX = null;
      playerO = null;
      io.sockets.emit('gameover', data);
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
      var nextTurnPlayer = isXTurn? playerX : playerO; // get the id of the next player
      io.to(nextTurnPlayer).emit('playturn');
      isXTurn = !isXTurn; // switch turns
    });


  })


//module.exports = app;
server.listen(8080);
