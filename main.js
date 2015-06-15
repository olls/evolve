// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              window.oRequestAnimationFrame      ||
              window.msRequestAnimationFrame     ||
              function(callback, element){
                window.setTimeout(callback, 1000 / 60);
              };
})();


function on (element, event, cb) {
  if (element.addEventListener) {
    element.addEventListener(event, cb, false);
  } else if (element.attachEvent) {
    element.attachEvent("on" + event, cb)
  } else {
    element["on" + event] = cb
  }
}


var SCALE = 30;

function Entity(id, x, y) {
  this.id = id;
  this.x = x;
  this.y = y;
  this.angle = 0;
}

Entity.prototype.update = function(state) {
  this.x = state.x;
  this.y = state.y;
  this.angle = state.a;
}

Entity.prototype.draw = function(ctx) {
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(this.x * SCALE, this.y * SCALE, 2, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();
}


function CircleEntity(id, x, y, radius) {
  Entity.call(this, id, x, y);
  this.radius = radius;
}

CircleEntity.prototype = new Entity();
CircleEntity.prototype.constructor = CircleEntity;

CircleEntity.prototype.draw = function(ctx) {
  ctx.fillStyle = 'blue';
  ctx.beginPath();
  ctx.arc(this.x * SCALE, this.y * SCALE, this.radius * SCALE, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();

  Entity.prototype.draw.call(this, ctx);
}


function RectangleEntity(id, x, y, halfWidth, halfHeight) {
  Entity.call(this, id, x, y);
  this.halfWidth = halfWidth;
  this.halfHeight = halfHeight;
}

RectangleEntity.prototype = new Entity();
RectangleEntity.prototype.constructor = RectangleEntity;

RectangleEntity.prototype.draw = function(ctx) {
  ctx.save();
  ctx.translate(this.x * SCALE, this.y * SCALE);
  ctx.rotate(this.angle);
  ctx.translate(-(this.x) * SCALE, -(this.y) * SCALE);
  ctx.fillStyle = 'red';
  ctx.fillRect((this.x-this.halfWidth) * SCALE,
               (this.y-this.halfHeight) * SCALE,
               (this.halfWidth*2) * SCALE,
               (this.halfHeight*2) * SCALE);
  ctx.restore();

  Entity.prototype.draw.call(this, ctx);
}


function randomEntity(id) {
  var x = Math.random() * canvas.width / SCALE;
  var y = Math.random() * canvas.height / SCALE;

  if (Math.random() > 0.5) {
    return new CircleEntity(id, x, y, Math.random() + 0.3);
  } else {
    return new RectangleEntity(id, x, y, Math.random() + 0.3, Math.random() + 0.3);
  }
}


var canvas = document.getElementById("cars");
var ctx = canvas.getContext("2d");

var world = {};
for (var i = 0; i < 20; i++) {
  world[i] = randomEntity(i);
}

var worker = new Worker('physics.js');
worker.postMessage({'cmd': 'start', 'msg': {'width': canvas.width / SCALE, 'height': canvas.height / SCALE}});
worker.postMessage({'cmd': 'bodies', 'msg': world});

on(document, 'webkitvisibilitychange', function() {
  if (document.webkitHidden) {
    worker.postMessage({'cmd': 'hidden'});
    console.log('page now hidden, sent msg to worker');
  } else {
    worker.postMessage({'cmd': 'visible'});
    console.log('page now visible, sent msg to worker');
  }
});

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (var id in world) {
    var entity = world[id];
    entity.draw(ctx);
  }
  requestAnimFrame(loop);
}

worker.onmessage = function(e) {
  switch (e.data.cmd) {
    case 'world':
      for (var id in e.data.msg) {
        var entity = world[id];
        if (entity) entity.update(e.data.msg[id]);
      }
      break;
    case 'ready':
      // Called once worker has received first bodies and processed them.
      loop();
      break;
  }
};
