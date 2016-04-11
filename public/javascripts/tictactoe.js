window.onload = function() {
  var timer = null;
  var socket = io.connect("http://localhost:8080/");

  //default settings
  var isXPlayer = false;
  var gameNum = null;
  var myTurn = false;
  var symbol = "O";

  /* Game start. */
  socket.on('playersFound', function(data){
    gameNum = data.gameID;
    if (data.playerStart) {
      symbol = "X";
      isXPlayer = true;
      myTurn = true;
    }
    // countdown to game start
    $('.waiting-text').fadeOut('slow', function() {
      $('.player-found-text').fadeIn('slow', function() {
        $('.player-found-text').fadeOut('slow', function() {
          $('.countdown').fadeIn('slow', function() {
            timer = setInterval(function() { handleTimer(3); }, 1000);
          });
        });
      });
    });
  });

  socket.on('triggerhover', function(data){
    var fromID = data.from;
    var square = data.square;
    if ((fromID != socket.id) && (data.gameID == gameNum)) {
      $(document.getElementById(square)).addClass('hover hover' + data.player);
    }
  });

  socket.on('removehover', function(data){
    var fromID = data.from;
    var square = data.square;
    if ((fromID != socket.id) && (data.gameID == gameNum)) {
      $(document.getElementById(square)).removeClass('hover hover' + data.player);
    }
  });

  socket.on('clicksquare', function(data){
    var fromID = data.from;
    var square = data.square;
    if ((fromID != socket.id) && (data.gameID == gameNum)) {
      $(document.getElementById(square)).addClass('clicked clicked' + data.player);
    }
  });

  socket.on('playturn', function(data){
    myTurn = true;
  });

  socket.on('gameover', function(data) {
    $('.overlay').fadeIn('slow');
    $('.box').fadeIn('slow');

    if ((data.winner == 'X' && isXPlayer) || (data.winner == 'O' && !isXPlayer)) {
      $('.win-prompt').fadeIn('slow');
    } else if (data.winner == 'TIE') {
      $('.tie-prompt').fadeIn('slow');
    } else if (data.winner == 'DC') {
      $('.dc-prompt').fadeIn('slow');
    } else {
      $('.lose-prompt').fadeIn('slow');
    }
    $('.play-again').fadeIn('slow');
    
    // reset default values
    isXPlayer = false;
    isSpectator = true;
    myTurn = false;
    symbol = "O";
    
  })

  $('.square').on('mouseover', function() { 
    if (myTurn && !$(this).hasClass('clicked')) {
      socket.emit('mouseover', { gameID: gameNum, player: symbol, from: socket.id , square: $(this).attr('id')});
      $(this).addClass('hover hover' + symbol);
    }
  });

  $('.square').on('mouseout', function() {
    if ($(this).hasClass('hover' + symbol) && !$(this).hasClass('clicked')) {
      socket.emit('mouseout', { gameID: gameNum, player: symbol, from: socket.id , square: $(this).attr('id')});
      $(this).removeClass('hover hover' + symbol);
    }
  });

  $('.square').on('click', function() {
    if (myTurn && !$(this).hasClass('clicked')) {
      socket.emit('clickedsquare', {gameID: gameNum, player: symbol, from: socket.id, square: $(this).attr('id')});
      $('.square').removeClass('hover hoverX');
      $('.square').removeClass('hover hoverO');
      $(this).addClass('clicked clicked' + symbol);
      socket.emit('nextturn', {gameID: gameNum});
      myTurn = false;
      checkWin();
    }
  });

  $('.play-again').on('click', function() {
    clearBoard();
    $('.play-again').hide();
    $('.gameover').hide();
    $('.waiting-text').fadeIn();
    socket.emit('joingame', {id: socket.id});

  });

  /* Clears the board. */
  function clearBoard() {
    $('.square').removeClass('hover hoverX');
    $('.square').removeClass('hover hoverO');

    $('.square').removeClass('clicked clickedX');
    $('.square').removeClass('clicked clickedO');
  }

  /* Countdown utility for ui. */
  var count = 3;
  function endCountdown() {
    $( '.overlay' ).fadeOut('slow');
    $('.box').fadeOut('slow');
    $('.countdown').hide();
    // reset counter
    count = 3;
    $('.countdown').html('GAME STARTS IN');
  }

  function handleTimer() {
    if(count === 0) {
      clearInterval(timer);
      endCountdown();
    } else {
      $('.countdown').hide().html(count).fadeIn('fast');
      count--;
    }
  }

  /* Function to check if this player won */
  function checkWin() {
    var squares = [];
    for (var i = 1; i <= 9; i++) {
      var classname = 'clicked' + symbol;
      squares[i] = $(document.getElementById(i)).hasClass(classname);
    }
    // top row
    var r1 = squares[1] && squares[2] && squares[3];
    // middle row
    var r2 = squares[4] && squares[5] && squares[6];
    // bottom row
    var r3 = squares[7] && squares[8] && squares[9];
    // left column
    var c1 = squares[1] && squares[4] && squares[7];
    // middle column
    var c2 = squares[2] && squares[5] && squares[8];
    // right column
    var c3 = squares[3] && squares[6] && squares[9];
    // left to right diagonal
    var d1 = squares[1] && squares[5] && squares[9];
    // right to left diagonal
    var d2 = squares[3] && squares[5] && squares[7];
    // are all the squares filled in
    var numClicked = $('.clicked').length;

    if (r1 || r2 || r3 || c1 || c2 || c3 || d1 || d2) {
      finishGame(symbol);
    } else {
      if (numClicked == 9)
        finishGame('TIE');
    }
  }
  
  function finishGame(symbol) {
    socket.emit('endgame', {gameID: gameNum, winner: symbol, disconnect: false});
  }
}
