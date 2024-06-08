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
    
    var reelsCount = 3;
    var reelsPositions = 3;
    var symbolsCount = 10;

    for (var i = 0; i < reelsCount; i++) {
      var reel = game.reels.add(reelsPositions);
      reel.x = 100 + (i * 140) + (i * 10);
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
    btnPlay.x = 100 + (2 * 140);
    btnPlay.y = 100 + (3 * 140);
    btnPlay.action = Slot.ACTION.PLAY;

    btnPlay.interactive = true;
    btnPlay.buttonMode = true;

    // btnPlay.on('pointerdown', function() {
    //   game.play();
    //   playGame();
    // });

    // game.stage.addChild(btnPlay);

    window.addEventListener('keydown', function(e) {
      if (e.keyCode == 32) {
        game.play();
        playGame();
      }
    });
  },
}, gameWidth, gameHeight);

/*
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
    
    var reelsCount = 4; // 리엘 카운트 4로 수정
    var reelsPositions = 3;
    var symbolsCount = 10;

    for (var i = 0; i < reelsCount; i++) {
      var reel = game.reels.add(reelsPositions);
      reel.x = 100 + (i * 140) + (i * 10);
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
    });

    network.onresponse = function(response) {
      game.result(response.result);
      highlightWinningLines(response.result);
      document.getElementById('balance').innerText = response.balance;
      document.getElementById('score').innerText = response.score;
    };

    var btnPlay = game.sprite('btn-spin');
    btnPlay.x = 100 + (2 * 140);
    btnPlay.y = 100 + (3 * 140);
    btnPlay.action = Slot.ACTION.PLAY;

    btnPlay.interactive = true;
    btnPlay.buttonMode = true;

    btnPlay.on('pointerdown', function() {
      playGame();
    });

    game.stage.addChild(btnPlay);

    window.addEventListener('keydown', function(e) {
      if (e.keyCode == 32) {
        playGame();
      }
    });
  },
}, gameWidth, gameHeight);

// 게임 시작 함수 (playGame)
async function playGame() {
  const betAmount = parseInt(document.getElementById('betAmount').value);
  const balance = parseInt(document.getElementById('balance').innerText);

  if (!betAmount) {
    alert('Please enter a bet amount.');
    return;
  }

  if (betAmount > balance) {
    alert('Insufficient balance.');
    return;
  }

  game.startSpin(); // 이미지 회전 시작

  // 네트워크 요청
  try {
    const response = await network.send(betAmount);
    game.result(response.result);
    highlightWinningLines(response.result);
    document.getElementById('balance').innerText = response.balance;
    document.getElementById('score').innerText = response.score;
  } catch (error) {
    console.error('Error during game play:', error);
  } finally {
    game.stopSpin(); // 스핀 종료
  }
}

// 승리 라인을 강조하는 함수
function highlightWinningLines(result) {
  const paylines = [
    [result[1][1], result[1][2], result[1][3]], // 중앙
    [result[0][1], result[0][2], result[0][3]], // 상단
    [result[2][1], result[2][2], result[2][3]], // 하단
    [result[1][1], result[0][1], result[2][1]], // 좌측
    [result[1][2], result[0][2], result[2][2]], // 중앙 세로
    [result[1][3], result[0][3], result[2][3]], // 우측
    [result[1][1], result[0][2], result[2][3]], // 대각선
    [result[2][1], result[0][2], result[1][3]]  // 역대각선
  ];

  paylines.forEach(line => {
    const uniqueNumbers = new Set(line);
    if (uniqueNumbers.size === 1 || line.some(num => num >= 3)) {
      line.forEach(num => {
        const symbol = document.querySelector(`.symbol-${num}`);
        if (symbol) {
          symbol.classList.add('highlight');
        }
      });
    }
  });
}

*/