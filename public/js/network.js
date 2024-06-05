var network = {
  send: function() {
    var respond = this.onresponse;
    setTimeout(async function() {
      try {
        const betAmount = document.getElementById('betAmount').value;
        if (!betAmount) {
          alert('Please enter a bet amount.');
          return;
        }

        const response = await fetch('/slot/result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ betAmount: parseInt(betAmount) })
        });
        const data = await response.json();

        if (data.error) {
          alert(data.error);
        } else {
          respond({
            result: data.result
          });
          document.getElementById('balance').innerText = data.balance;
          document.getElementById('score').innerText = data.score;
        }
      } catch (error) {
        console.error('Error fetching result:', error);
      }
    }, Math.random() * 500); // random response delay
  },
  onresponse: null,
};

var resourcesUrl = './img/';
var gameWidth = 640;
var gameHeight = 640;

var game = new Slot({
  container: '#game-container',
  resources: [
    ['symbol-1', resourcesUrl + 'symbol-1.png'],
    ['symbol-2', resourcesUrl + 'symbol-2.png'],
    ['symbol-3', resourcesUrl + 'symbol-3.png'],
    ['symbol-4', resourcesUrl + 'symbol-4.png'],
    ['symbol-5', resourcesUrl + 'symbol-5.png'],
    ['symbol-6', resourcesUrl + 'symbol-6.png'],
    ['symbol-7', resourcesUrl + 'symbol-7.png'],
    ['symbol-8', resourcesUrl + 'symbol-8.png'],
    ['symbol-9', resourcesUrl + 'symbol-9.png'],
    ['symbol-10', resourcesUrl + 'symbol-10.png'],
    ['btn-spin', resourcesUrl + 'button-spin.png'],
    ['background', resourcesUrl + 'background.png'],
  ],
  settings: {
    speed: 0.27,
    spinTime: 175,
    spinTimeBetweenReels: 100,
    reelBounceDuration: 300,
    network: true,
  },
  init: function(game) {
    var background = game.sprite('background');

    // reels 3x3
    var reelsCount = 3; 
    var reelsPositions = 3; 
    var symbolsCount = 10;
    for (var i = 0; i < reelsCount; i++) {
      var reel = game.reels.add(reelsPositions);
      reel.x = 100 + (i * 140) + (i * 10); // l 381 
      reel.y = 118;

      for (var k = 0; k < reelsPositions + 1; k++) {
        reel.values.push(parseInt(Math.random() * symbolsCount) + 1);
      }
    }

    game.on('start', function() {
      for (var i = 0; i < reelsCount; i++) {
        for (var k = 0; k < 100; k++) {
          game.reels.get(i).spinValues.push(parseInt(Math.random() * symbolsCount) + 1);
        }
      }
      network.send();
    });

    network.onresponse = function(response) {
      game.result(response.result);
    };

    var btnPlay = game.sprite('btn-spin');
    btnPlay.x = 100 + (2 * 140); // l 381 
    btnPlay.y = 100 + (3 * 140);
    btnPlay.action = Slot.ACTION.PLAY;

    window.addEventListener('keydown', function(e) {
      if (e.keyCode == 32) {
        game.play();
        playGame();
      }
    });
  },
}, gameWidth, gameHeight);
