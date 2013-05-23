var createDrone   = require('../');
var createEngine  = require('voxel-engine');
var createTerrain = require('voxel-perlin-terrain');
var logodrone     = require('logo-drone')();

var tic = require('tic')();

// create the game
var game = createEngine({
  //generateVoxelChunk: createTerrain({scaleFactor:10}),
  generate: function(x, y, z) {
    return (Math.sqrt(x*x + y*y + z*z) > 100 || y*y > 10) ? 0 : (Math.random() * 3) + 1;
  },
  chunkDistance: 2,
  materials: [
    'obsidian',
    ['grass', 'dirt', 'grass_dirt'],
    'grass',
    'plank'
  ],
  texturePath: './textures/',
  worldOrigin: [0, 0, 0]
});
var container = document.getElementById('container');
game.appendTo(container);

// create shama
var createPlayer = require('voxel-player')(game);
var shama = createPlayer('textures/shama.png');
shama.yaw.position.set(0, 10, 0);
shama.possess();

// add some trees
/*var createTree = require('voxel-forest');
for (var i = 0; i < 20; i++) {
  createTree(game, { bark: 4, leaves: 3 });
}*/

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
    var cmd = el.value, res;
    try {
      if (cmd.indexOf('(') === -1) {
        // logo ftw!
        logodrone.convertAndSend(cmd);
      } else if (el.value !== '') {
        res = eval('drone.' + el.value);
      }
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
var drone = window.drone = logodrone.drone = createDrone(game);
var item = drone.item();

// start the drone in front of the player
item.avatar.position.set(0, 10, -10);

game.on('tick', tic.tick.bind(tic));
tic.interval(function() {
  //console.log(item.avatar.position);
  console.log(item.velocity);
}, 1000);
// show the video monitor
//drone.viewCamera();

// log navdata
/*var battery = document.querySelector('#battery');
drone.on('navdata', function(data) {
  battery.innerHTML = data.demo.batteryPercentage + '%';
  //console.log(data);
});*/

// fly the drone
tic.timeout(function() {
  drone.takeoff();
  /*setTimeout(function() {
    drone.animateLeds('blinkGreenRed', 30, 10);
  }, 2000);*/
  var cmds = [
    'up', 'front', 'clockwise', 'front',
    //'front', 'clockwise', 'front',
    //'back', 'clockwise', 'back',
    //'left', 'clockwise', 'left',
    //'right', 'clockwise', 'right',
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
    tic.timeout(loop, cmd === 'clockwise' ? 2000 : 3000);
  }());
}, 2000);
