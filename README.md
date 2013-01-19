# voxel-drone

> An AR Drone simulator in [voxeljs](http://voxeljs.com).

_work in progress. please view the issue tracker if you would like to help!_

## example

Open up the demo:
[shama.github.com/voxel-drone](http://shama.github.com/voxel-drone). Then in the
command box at the bottom type: `takeoff()`. Or open up the javascript console
and type: `drone.takeoff()`.

It works with a browserified version of
[ar-drone](https://github.com/felixge/node-ar-drone) and reads raw `AT*`
commands (well almost). So all the commands you do in ar-drone you can do
here as well:

```js
drone.takeoff();
drone
  .after(5000, function() {
    this.animate('flipLeft', 15);
  })
  .after(5000, function() {
    this.stop();
    this.clockwise(0.3);
  })
  .after(3000, function() {
    this.stop();
    this.land();
  });
```

## usage

In your voxeljs world add a drone with the following:

```js
// create a world
var createEngine = require('voxel-engine');
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

// voxel-drone returns a function to create a drone
var createDrone = require('voxel-drone');

// create a drone / add to the game
var drone = createDrone(game);
game.addItem(drone.item());

// tell the drone to take off
drone.takeoff();
```

## testing

Install devDeps with:
`npm install grunt-cli -g && npm install browserify -g && npm install`.

Then run: `grunt` to copy files, browserify things and run a server on
[http://localhost:8085](http://localhost:8085).

## release history
* 0.2.1 - cap the amount of tilt. add front texture. update voxel engine.
* 0.2.0 - video camera!
* 0.1.2 - fix animations and leds
* 0.1.1 - fix rotation relative direction
* 0.1.0 - initial release

## license
Copyright (c) 2013 Kyle Robinson Young  
Licensed under the MIT license.
