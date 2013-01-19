var createDrone = require('../');
var createEngine = require('voxel-engine');
var createTerrain = require('voxel-perlin-terrain');

// create the game
var game = createEngine({
  generateVoxelChunk: createTerrain({scaleFactor:10}),
  chunkDistance: 2,
  materials: [
    'obsidian',
    ['grass', 'dirt', 'grass_dirt'],
    'grass',
    'plank'
  ],
  texturePath: './textures/',
  startingPosition: [35, -1200, 35],
  worldOrigin: [0,0,0],
});
var container = document.getElementById('container');
game.appendTo(container);
container.addEventListener('click', function() {
  game.requestPointerLock(container);
});

// add some trees
var createTree = require('voxel-forest');
for (var i = 0; i < 20; i++) {
  createTree(game, { bark: 4, leaves: 3 });
}

// ability to explode voxels
var explode = require('voxel-debris')(game);
game.on('mousedown', function (pos) {
  if (erase) explode(pos);
  else game.createBlock(pos, 1);
});

var erase = true;
function ctrlToggle (ev) { erase = !ev.ctrlKey }
window.addEventListener('keydown', ctrlToggle);
window.addEventListener('keyup', ctrlToggle);

// Handle entering a command
window.addEventListener('keyup', function(e) {
  if (e.keyCode !== 13) return;
  var el = document.getElementById('cmd');
  if (document.activeElement === el) {
    var res;
    try {
      if (el.value !== '') res = eval('drone.' + el.value);
    } catch (err) {
      res = err.message;
    }
    el.setAttribute('placeholder', res);
    el.value = '';
    el.blur();
  } else {
    el.focus();
  }
});

// create a drone
var drone = window.drone = createDrone(game);
var item = drone.item();
item.mesh.position.set(0, -1200, -300);
game.addItem(item);

// show the video monitor
drone.viewCamera();

// log navdata
//drone.on('navdata', console.log.bind(console));

// fly the drone
/*setTimeout(function() {
  drone.takeoff();
  setTimeout(function() {
    drone.animateLeds('blinkGreenRed', 30, 10);
  }, 2000);
  return;
  var cmds = [
    'front', 'clockwise', 'front',
    'back', 'clockwise', 'back',
    'left', 'clockwise', 'left',
    'right', 'clockwise', 'right',
  ];
  var i = 0;
  (function loop() {
    if (i >= cmds.length) {
      //drone.stop();
      drone.land();
      return;
    }
    var cmd = cmds[i++];
    drone.stop();
    console.log(cmd);
    drone[cmd](0.5);
    setTimeout(loop, cmd === 'clockwise' ? 2000 : 5000);
  }());
}, 5000);*/
