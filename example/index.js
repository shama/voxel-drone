var createEngine = require('voxel-engine');
var createDrone = require('../');

// create the game
var game = createEngine({
  generate: function(x, y, z) {
    return (Math.sqrt(x*x + y*y + z*z) > 20 || y*y > 10) ? 0 : (Math.random() * 2) + 1;
  },
  texturePath: './textures/',
  materials: ['dirt', 'grass']
});
var container = document.body;
game.appendTo(container);
container.addEventListener('click', function() {
  game.requestPointerLock(container);
});

// Handle entering a command
window.addEventListener('keyup', function(e) {
  if (e.keyCode === 13) {
    var el = document.getElementById('cmd');
    el.setAttribute('placeholder', eval('drone.' + el.value));
    el.value = '';
  }
});

// create a drone
var drone = window.drone = createDrone(game);
game.addItem(drone.item());

// log navdata
//drone.on('navdata', console.log.bind(console));

// fly the drone
/*drone
  .after(5000, function() {
    console.log('takeoff');
    this.takeoff();
  })
  .after(2000, function() {
    console.log('flip left');
    this.stop();
    this.up(0.5);
    this.animateLeds('blinkRed', 5, 2);
    //this.front(0.5);
    //this.animate('flipLeft', 15);
  })
  .after(5000, function() {
    console.log('flip right');
    this.stop();
    this.animateLeds('blinkGreen', 5, 2);
    //this.back(0.5);
    //this.animate('flipRight', 15);
  })
  .after(5000, function() {
    console.log('flip ahead');
    this.stop();
    //this.front(0.5);
    this.animate('flipAhead', 15);
  })
  .after(5000, function() {
    console.log('flip behind');
    this.stop();
    //this.back(0.5);
    this.animate('flipBehind', 15);
  })
  .after(5000, function() {
    console.log('left');
    this.stop();
    this.left(0.5);
  })
  .after(5000, function() {
    console.log('right');
    this.stop();
    this.right(0.5);
  })
  .after(5000, function() {
    console.log('up');
    this.stop();
    this.clockwise(0.5);
    this.up(1);
  })
  .after(5000, function() {
    console.log('down');
    this.stop();
    this.counterClockwise(0.5);
    this.down(0.5);
  })
  .after(5000, function() {
    console.log('land');
    this.stop();
    this.land();
  });*/
