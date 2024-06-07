/**
 * Represents a Slot Machine game.
 * @constructor
 * @param {Object} params - The parameters required to create a game, such as resources, settings, etc.
 * @param {number} gameWidth - The width of the game.
 * @param {number} gameHeight - The height of the game.
 * @example
 * let game = new Slot({
 *  container: '.game-container',
 * }, 100, 100);
 */
var Slot = function(params, gameWidth, gameHeight) {
  this.VERSION = '0.1';
  this.engine = new Slot.Game(gameWidth, gameHeight);
  this.engine.game = this;
  this.reels = new Slot.ReelsController(this);
  this.events = {
    start: [],
    stop: [],
  };
  this.settings = {
    speed: 0.2,
    spinTime: 450,
    spinTimeBetweenReels: 120,
    reelBounceDuration: 300,
    network: false,
  };
  this.waitForResult = false;
  this.forceStopPending = false;

  this.reels.onStart(function() {
    if (this.settings.network) {
      this.waitForResult = true;
    }
    this.events.start.forEach(function(fn) {
      fn();
    });
  }.bind(this));

  this.reels.onStop(function() {
    this.events.stop.forEach(function(fn) {
      fn();
    });
  }.bind(this));

  params = params || {};
  if (params.container) {
    var containerEl = document.querySelector(params.container);
    if (containerEl) {
      containerEl.appendChild(this.engine.renderer.view);
    } else {
      console.error("Invalid container");
    }
  } else {
    document.body.appendChild(this.engine.renderer.view);
  }
  
  function onResize() {
    var ratio = gameWidth / gameHeight;
    var view = this.engine.renderer.view;
    var width = view.parentNode.offsetWidth;
    var height = width / ratio;
    if (height > view.parentNode.offsetHeight) {
      height = view.parentNode.offsetHeight;
      width = ratio * height;
    }
    this.engine.renderer.resize(width, height);
  }
  onResize.bind(this)();
  window.addEventListener('resize', onResize.bind(this));

  var _this = this;
  
  if ('resources' in params) {
    params.resources.forEach(function(resource) {
      if (resource.length) {
        PIXI.Loader.shared.add(resource[0], resource[1]);
      } else {
        PIXI.Loader.shared.add(resource.key, resource.value);
      }
    });
  }

  if ('init' in params) {
    PIXI.Loader.shared.load(function() {
      params.init.bind(_this)(_this);
    });
  }

  if ('settings' in params) {
    for (var key in params.settings) {
      this.settings[key] = params.settings[key];
    }
    this.reels.spinTime = this.settings.spinTime;
    this.reels.spinTimeBetweenReels = this.settings.spinTimeBetweenReels;
  }
};

/**
 * This is the load resources method used to add resources to the game.
 * @param {Array} config - Array with resources key and source path.
 * @param {function} onComplete - Complete method which runs after loading is finished.
 */
Slot.prototype.load = function(config, onComplete) {
  config.forEach(function(resource) {
    if (resource.length) {
      PIXI.Loader.shared.add(resource[0], resource[1]);
    } else {
      PIXI.Loader.shared.add(resource.key, resource.value);
    }
  });
  PIXI.Loader.shared.load(onComplete);
};
/**
 * The main play method used to start or stop the reels.
 */
Slot.prototype.play = function() {
  if (!this.waitForResult) {
    if (!this.reels.rolling) {
      this.reels.start();
    } else {
      this.reels.stop();
    }
  }
  if (this.reels.rolling) {
    this.forceStopPending = true;
  }
};
/**
 * The result method is used to set a result and stop the reels.
 * @param {Array} result - The array containing the result for each reel.
 */
Slot.prototype.result = function(result) {
  this.reels.reels.forEach(function(reel, reelIndex) {
    reel.stopValues = result[reelIndex];
  });
  if (this.forceStopPending) {
    this.reels.stop();
    this.forceStopPending = false;
  }
  this.waitForResult = false;
};
/**
 * The method to attach event handlers on game.
 * @param {string} eventName - The name of the event.
 * @param {function} fn - The event callback.
 */
Slot.prototype.on = function(eventName, fn) {
  if (eventName in this.events) {
    this.events[eventName].push(fn);
  }
};
/**
 * The method to add a sprite in the game.
 * @param {string} resourceKey - The name of the resource, which must have been set on loading's configuration.
 */
Slot.prototype.sprite = function(resourceKey) {
  var sprite = new Slot.Sprite(resourceKey, this.engine);
  return sprite;
};
/**
 * Describes game actions. Can be attached to sprites.
 * @example
 * let buttonPlay = game.sprite('btn-play');
 * buttonPlay.action = Slot.ACTION.PLAY;
 */
Slot.ACTION = {
  NO_ACTION: 0,
  PLAY: 1,
};
Slot.Game = function(width, height) {
  this.width = width;
  this.height = height;
  PIXI.utils.skipHello();
  this.renderer = new PIXI.autoDetectRenderer({
    width: 800,
    height: 600,
    transparent: false,
  });
  this.stage = new PIXI.Container();

  var _this = this;

  PIXI.Ticker.shared.add(function() {
    _this.renderer.render(_this.stage);
  }, PIXI.UPDATE_PRIORITY.NORMAL);
};
Slot.ReelsController = function(game) {
  this.reels = [];
  this.engine = game.engine;
  this.game = game;
  this.x = 0;
  this.y = 0;
  this.events = {
    onStart: [],
    onStop: [],
  };
  this.rolling = false;

  var _this = this;
  function resizeAndPosition() {
    _this.reels.forEach(function(reel, reelIndex) {
      reel.container.x = (reel.x * game.engine.renderer.view.width) / game.engine.width;
      reel.container.y = (reel.y * game.engine.renderer.view.height) / game.engine.height;
      reel.symbols.forEach(function(symbol) {
        symbol.scale.x = game.engine.renderer.view.width / game.engine.width;
        symbol.scale.y = game.engine.renderer.view.height / game.engine.height;
      });
    });
  }
  resizeAndPosition();
  var rollingTime = 0;
  PIXI.Ticker.shared.add(function(delta) {
    var active = false;
    _this.reels.forEach(function(reel, reelIndex) {
      resizeAndPosition();
      
      reel.render(game.settings.speed, game.settings.reelBounceDuration, reelIndex);

      for (var i = 0; i < reel.symbols.length; i++) {
        var symbol = reel.symbols[i];
        symbol.y = (symbol.height * (i - 1)) + (0 + reel.offset);
        if (reel.values[i]) {
          if ('symbol-' + reel.values[i] in PIXI.Loader.shared.resources) {
            symbol.texture = PIXI.Loader.shared.resources['symbol-' + reel.values[i]].texture;
          } else {
            symbol.texture = PIXI.Texture.EMPTY;
          }
        } else {
          symbol.texture = PIXI.Texture.EMPTY;
        }
      }
      
      var m = reel.mask;
      m.x = reel.container.x;
      m.y = reel.container.y;
      m.clear();
      m.beginFill(0x000000);
      m.drawRect(0, 0, reel.symbols[0].width, reel.symbols[0].height * reel.positions);
      m.endFill();

      active = reel.rolling == true || !isNaN(parseInt(reel.stopping));

      if (active) {
        var reelStopTime = game.settings.spinTime + (reelIndex * game.settings.spinTimeBetweenReels);
        if (rollingTime > reelStopTime) {
          reel.stop(); // FIXME: don't call stop multiple times
        }
      }
    });

    if (!_this.rolling && active) {
      _this.rolling = true;
      _this.events.onStart.forEach(function(fn) {
        fn();
      }); 
    } else if (_this.rolling && !active) {
      _this.rolling = false;
      rollingTime = 0;
      _this.events.onStop.forEach(function(fn) {
        fn();
      });
    }

    if (active && !game.waitForResult) {
      rollingTime += delta * 16.667;
    }
  }, PIXI.UPDATE_PRIORITY.HIGH);
};

Slot.ReelsController.prototype.add = function(positions, symbolCount, symbolWidth, symbolHeight) {
  var reel = new Slot.Reel(positions, symbolCount, symbolWidth, symbolHeight);
  this.engine.stage.addChild(reel.container);
  this.engine.stage.addChild(reel.mask);
  this.reels.push(reel);
  return reel;
};

Slot.ReelsController.prototype.get = function(index) {
  return this.reels[index];
};

Slot.ReelsController.prototype.start = function() {
  this.reels.forEach(function(reel) {
    reel.roll();
  });
};

Slot.ReelsController.prototype.stop = function() {
  this.reels.forEach(function(reel) {
    reel.stop();
  });
};

Slot.ReelsController.prototype.onStart = function(fn) {
  this.events.onStart.push(fn);
};

Slot.ReelsController.prototype.onStop = function(fn) {
  this.events.onStop.push(fn);
};
/**
 * Represents a reel in the game.
 * @constructor
 * @param {number} positions - Number of reel positions.
 */
Slot.Reel = function(positions) {
  this.positions = positions;
  this.values = [];
  this.spinValues = [];
  this.stopValues = [];
  this.symbols = [];
  this.container = new PIXI.Container();
  this.mask = new PIXI.Graphics();
  this.offset = 0;
  this.rolling = false;
  this.stopping = false;

  this.container.mask = this.mask;

  for (var i = 0; i < positions + 1; i++) {
    var symbol = new PIXI.Sprite(PIXI.Texture.EMPTY);
    this.container.addChild(symbol);
    this.symbols.push(symbol);
  }
};

Slot.Reel.prototype.render = function(speed, bounceDuration, reelIndex) {
  var _this = this;

  if (this.rolling) {
    this.offset += this.symbols[0].height * speed;
    
    if (this.offset >= this.symbols[0].height) {
      this.offset = 0;
      if (!isNaN(parseInt(this.stopping))) {
        if (!this.stopValues.length) {
          console.error('No stop values have been set for reel: ' + reelIndex);
        }
        this.values.unshift(this.stopValues.pop());
        this.stopping++;
      } else {
        this.values.unshift(this.spinValues.pop());
      }
      this.values.splice(-1, 1);
    }

    if (this.stopping == this.positions + 1) {
      this.rolling = false;
      this.stopping++;
      var o = {
        offset: _this.symbols[0].height * speed,
      };
      this.offset = o.offset;
      anime({
        targets: o,
        offset: 0,
        round: 1,
        duration: bounceDuration,
        easing: 'easeOutQuint',
        update: function() {
          _this.offset = o.offset;
        },
        complete: function() {
          _this.stopping = false;
        },
      });
    }
  }
};
/**
 * Starts reel spinning.
 */
Slot.Reel.prototype.roll = function() {
  if (!this.rolling && this.stopping === false) {
    this.rolling = true;
  }
};
/**
 * Stops reel from spinning.
 */
Slot.Reel.prototype.stop = function() {
  if (this.rolling && this.stopping === false) {
    this.stopping = 0;
  }
};

Slot.Sprite = function(resourceKey, engine) {
  this.instance = new PIXI.Sprite(PIXI.Loader.shared.resources[resourceKey].texture);
  this.x = 0;
  this.y = 0;
  
  Object.defineProperties(this, {
    action: {
      set: function(value) {
        this.instance.interactive = false;
        this.instance.off('pointerdown');
        switch (value) {
          case Slot.ACTION.PLAY:
            this.instance.interactive = true;
            this.instance.on('pointerdown', function() {
              engine.game.play();
            });
            break;
        };
      },
    },
    visible: {
      set: function(value) {
        this.instance.visible = value;
      },
      get: function() {
        return this.instance.visible;
      },
    },
  });

  var _this = this;
  function resizeAndPosition() {
    var pixiSprite = _this.instance;
    pixiSprite.scale.x = engine.renderer.view.width / engine.width;
    pixiSprite.scale.y = engine.renderer.view.height / engine.height;
    pixiSprite.x = (_this.x * engine.renderer.view.width) / engine.width;
    pixiSprite.y = (_this.y * engine.renderer.view.height) / engine.height;
  }
  resizeAndPosition();
  PIXI.Ticker.shared.add(function() {
    resizeAndPosition();
  }, PIXI.UPDATE_PRIORITY.HIGH);

  engine.stage.addChild(this.instance);
};