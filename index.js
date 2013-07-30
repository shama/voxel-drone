var util       = require('util');
var ardrone    = require('ar-drone-browserified');
var parseAT    = require('./lib/atreader');
var createCam  = require('voxel-camera');
var tic        = require('tic')();

var Drone = function(options) {
  var self = this;
  if (options.THREE) options = {game:options};
  if (!options.game) throw new Error('Must specify a game.');
  self.game = options.game;

  self.game.on('tick', tic.tick.bind(tic));

  self.size                = options.size || 1;
  self.altitudeLimit       = options.altitudeLimit || 0;
  self.yawSpeed            = options.yawSpeed || 0.1;
  self.verticalSpeed       = options.verticalSpeed || 0.1;
  self.tilt                = options.tilt || 0.1;
  self.flying              = false;
  self.batteryCapacity     = 120000; // 20 mins
  self._batteryLevel       = 120000;
  self._animating          = false;
  self._ledanimating       = false;
  self._navdata            = require('./lib/navdata.json');
  self._drone              = false;

  options.udpNavdataStream = options.udpNavdataStream || new ardrone.UdpNavdataStream({
    parser: function(buf) { return buf; }
  });
  ardrone.Client.call(self, options);

  // copy over ANIMATIONS and LED_ANIMATIONS
  self.ANIMATIONS = require('ar-drone-browserified/lib/control/AtCommandCreator').ANIMATIONS;
  self.LED_ANIMATIONS = require('ar-drone-browserified/lib/control/AtCommandCreator').LED_ANIMATIONS;
  self.LED_COLORS = {
    0: [new self.game.THREE.Color(0x000000), 0],
    1: [new self.game.THREE.Color(0xff0000), 1],
    2: [new self.game.THREE.Color(0x00ff00), 1],
    3: [new self.game.THREE.Color(0xff9900), 1]
  };

  // on data from udpControl
  self._cmds = [];
  self._udpControl._socket.on('data', function(cmds) {
    self._cmds = self._cmds.concat(parseAT(cmds));
  });

  // start up emitters
  self.resume();

  // emit navdata
  var seq = 0;
  setInterval(function() {
    if (options.udpNavdataStream._initialized === true) {
      options.udpNavdataStream._socket.emit('message', self._emitNavdata(seq++));
    }
  }, 100);
};
util.inherits(Drone, ardrone.Client);
module.exports = function(options) { return new Drone(options); };
module.exports.Drone = Drone;

// return the drone item to add to game
Drone.prototype.item = function(item) {
  var self = this;

  if (item) {
    item.tick = self.createTick(item);
    self._drone = item;
    return self._drone;
  }

  var group = new self.game.THREE.Object3D();

  var drone = new self.game.THREE.Mesh(
    new self.game.THREE.CubeGeometry(self.size, self.size/6, self.size),
    self.game.materials.material
  );
  drone.position.set(0, self.size/6, 0);
  drone.rotation.y = deg2Rad(-90);
  group.add(drone);

  self.game.materials.load([[
    'drone-side', 'drone-front',
    'drone-top', 'drone-bottom',
    'drone-side', 'drone-side'
  ]], function(textures) {
    self.game.materials.paint(drone, textures[0]);
  });

  self._leds = self._addLEDs(group);
  self.leds('standard');

  self._drone = self.game.addItem({
    mesh: group,
    size: self.size,
    velocity: {x: 0, y: 0, z: 0}
  });
  self._drone.tick = self.createTick(self._drone);
  return self._drone;
};

// process AT* commands to control drone
Drone.prototype.createTick = function(drone) {
  var self = this;
  var dt = 0;
  var oldTick = drone.tick || function() {};
  return function(delta) {
    dt += 0.01;

    // drain battery - video on, flying, animating
    self._batteryLevel -= (self._animating && self.flying) ? 4
      : (self.flying) ? 1.75
      : 0.5;

    // dead battery X|
    if (self._batteryLevel <= 0) { self.land(); return; }

    oldTick.call(drone, delta);

    var didem = [];
    self._cmds.forEach(function(cmd) {
      // only process the first unique
      if (didem.indexOf(cmd.type + cmd.args[0]) !== -1) return;
      didem.push(cmd.type + cmd.args[0]);
      self['_handle' + cmd.type](dt, drone, cmd);
    });
    self._cmds = [];

    // render the camera, follow the drone
    if (self._cameraControl) {
      self._cameraControl.render(
        self._drone,
        new self.game.THREE.Vector3(-20, 0, 0),
        new self.game.THREE.Vector3(-100, 0, 0)
      );

      // monitor follows the player
      self._monitor.position = self.game.controls.yawObject.position.clone();
      self._monitor.position.z += 35;
      self._monitor.position.y -= 25;
    }
  };
};

// display video monitor
// todo: integrate more with ar-drone lib
// also where is the bottom camera?
Drone.prototype.viewCamera = function() {
  var self = this;
  if (!self._cameraControl) {
    self._cameraControl = createCam(self.game);

    // use the camera's png stream :D
    self._pngStream = self._cameraControl;

    // add the camera
    var camera = self._cameraControl.camera();
    self.game.scene.add(camera);

    self._monitor = new self.game.THREE.Object3D();

    var height = 20;
    var padding = 2;

    var video = new self.game.THREE.Mesh(
      new self.game.THREE.CubeGeometry(1.77 * height, height, 0),
      new self.game.THREE.MeshBasicMaterial({
        map: self._cameraControl.monitor()
      })
    );
    self._monitor.add(video);

    // border
    var border = new self.game.THREE.Mesh(
      new self.game.THREE.CubeGeometry((1.77 * height) + padding, height + padding, 1),
      new self.game.THREE.MeshBasicMaterial({color: 0x000000})
    );
    border.position.set(0, 0, 1);
    self._monitor.add(border);

    self._monitor.rotation.x = deg2Rad(60);
    self.game.scene.add(self._monitor);
  }
  return self._monitor;
};

// turn on/off the leds
Drone.prototype.leds = function(leds) {
  var self = this;
  if (typeof leds === 'string') {
    if (leds === 'red')           leds = [1, 1, 1, 1];
    else if (leds === 'green')    leds = [2, 2, 2, 2];
    else if (leds === 'standard') leds = [1, 1, 2, 2];
    else                          leds = [0, 0, 0, 0];
  }
  leds.forEach(function(led, i) {
    var obj = self._leds[i];
    obj.material.color = obj.material.emissive = self.LED_COLORS[led][0];
    obj.material.opacity = self.LED_COLORS[led][1];
    obj.material.transparent = (obj.material.opacity < 1) ? true : false;
  });
};

Drone.prototype._addLEDs = function(group) {
  var leds = [];
  for (var i = 0; i < 4; i++) {
    var led = new this.game.THREE.Mesh(
      new this.game.THREE.CubeGeometry(this.size/20, this.size/20, this.size/20),
      new this.game.THREE.MeshLambertMaterial({color:0x000000,ambient:0xffffff,emissive:0x000000})
    );
    led.translateX((this.size / 3) * (Math.sin(deg2Rad(i * 90) + deg2Rad(45))));
    led.translateZ((this.size / 3) * (Math.cos(deg2Rad(i * 90) + deg2Rad(45))));
    leds.push(led);
    if (group) group.add(led);
  }
  return leds;
};

Drone.prototype._emitNavdata = function(seq) {
  var self = this;
  with (self._navdata) {
    sequenceNumber = seq;
    demo.batteryPercentage = Math.floor((self._batteryLevel / self.batteryCapacity) * 100);
    droneState.flying = self.flying ? 1 : 0;
    // todo: set this closer to actual states
    demo.controlState = self.flying ? 'CTRL_FLYING' : 'CTRL_LANDED';
    if (self._drone !== false) {
      /*demo.rotation.frontBack = demo.rotation.pitch = demo.rotation.theta = demo.rotation.y = demo.frontBackDegrees = self._drone.avatar.mesh.rotation.x;
      demo.rotation.leftRight = demo.rotation.roll  = demo.rotation.phi   = demo.rotation.x = demo.leftRightDegrees = self._drone.avatar.mesh.rotation.z;
      demo.rotation.clockwise = demo.rotation.yaw   = demo.rotation.psi   = demo.rotation.z = demo.clockwiseDegrees = self._drone.avatar.mesh.rotation.y;
      demo.velocity.x = demo.xVelocity = self._drone.velocity.z;
      demo.velocity.y = demo.yVelocity = self._drone.velocity.x;
      demo.velocity.z = demo.zVelocity = self._drone.velocity.y;*/
      // todo: calculate altitude
    }
  }
  return self._navdata;
};

Drone.prototype._handleREF = function(dt, drone, cmd) {
  var self = this;
  if (cmd.args[0] === 512) {
    setxyz(drone.resting, false);
    if (!self.flying) {
      // takeoff!
      drone.removeForce(self.game.gravity);
      drone.velocity.y += 0.002;
      self.flying = true;
      tic.timeout(function() { drone.velocity.y = 0; }, 500);
    }
  } else {
    if (self.flying) {
      // land!
      self.stop();
      setxyz(drone.velocity, 0);
      setxyz(drone.avatar.children[0].rotation, 0);
      drone.subjectTo(self.game.gravity);
      self.flying = false;
      // TODO: land more realistically
    }
  }
};

Drone.prototype._handlePCMD = function(dt, drone, cmd) {
  if (!this.flying) return;
  setxyz(drone.velocity, 0);

  // args: flags, leftRight, frontBack, upDown, clockWise
  // dont know why leftRight/frontBack are totally switched but they are!
  var frontBack = cmd.args[2] || 0;
  var leftRight = cmd.args[1] || 0;
  var upDown    = cmd.args[3] || 0;
  var clockwise = cmd.args[4] || 0;

  // reduce speed
  var tilt = this.tilt / 100;
  var verticalSpeed = this.verticalSpeed / 100;

  var rot = drone.avatar.children[0];

  // todo: figure auto leveling out
  // when it hits 0, it doesnt level for some reason
  rot.rotation.x = anim(dt, rot.rotation.x, -frontBack/2);
  if (frontBack !== 0) drone.velocity.z = frontBack * tilt;
  else if (!this._animating) rot.rotation.x = 0;

  rot.rotation.z = anim(dt, rot.rotation.z, -leftRight/2);
  if (leftRight !== 0) drone.velocity.x = -leftRight * tilt;
  else if (!this._animating) rot.rotation.z = 0;

  if (upDown !== 0) drone.velocity.y += upDown * verticalSpeed;
  if (clockwise !== 0) drone.rotation.y += clockwise * this.yawSpeed;

  // tmp fallback level out
  if (frontBack === 0 && leftRight === 0 && !this._animating) {
    rot.rotation.x = 0;
    rot.rotation.z = 0;
  }

  // cap the amount of tilt
  if (Math.abs(rot.rotation.z) >= 1 && !this._animating) {
    rot.rotation.z = rot.rotation.z < 0 ? -1 : 1;
  }
  if (Math.abs(rot.rotation.x) >= 1 && !this._animating) {
    rot.rotation.x = rot.rotation.x < 0 ? -1 : 1;
  }
};

// Handle AT*CONFIG
Drone.prototype._handleCONFIG = function(dt, drone, cmd) {
  switch (cmd.args[0]) {
    case 'control:flight_anim':
      this._handleANIM(dt, drone, cmd);
      break;
    case 'leds:leds_anim':
      this._handleLED(dt, drone, cmd);
      break;
  }
};

// Handle AT*CONFG=1,control:flight_anim
Drone.prototype._handleANIM = function(dt, drone, cmd) {
  var self = this;
  if (!self.flying || this._animating) return;

  // todo: tweak this closer to actual drone
  var duration = Number(cmd.args[2]) * 10;
  var type     = this.ANIMATIONS[parseInt(cmd.args[1])];

  self._animating = true;
  tic.timeout(function() { self._animating = false; }, duration);

  switch (type) {
    case 'flipLeft': case 'flipRight':
    case 'flipAhead': case 'flipBehind':
      // todo: for longer durations this gets out of hand. should only happen once.
      drone.velocity.y += 0.0045;
      tic.timeout(function() {
        var amt = (type === 'flipLeft' || type === 'flipAhead') ? deg2Rad(360) : -deg2Rad(360);
        var dir = (type === 'flipLeft' || type === 'flipRight') ? 'x' : 'z';
        drone.avatar.children[0].rotation[dir] = anim(dt, drone.avatar.children[0].rotation[dir], amt, duration);
      }, duration / 5);
      // todo: better adjust above to mimic actual drone
      // where it flies up dramatically flips and comes down
      tic.timeout(function() {
        drone.velocity.y -= 0.002;
      }, duration - (duration / 10));
      break;
    // todo: handle the other animations
  }
};

// Handle AT*CONFG=1,control:leds_anim
// todo: this is totally not correct!
Drone.prototype._handleLED = function(dt, drone, cmd) {
  var self     = this;
  if (this._ledanimating) return;

  var type     = this.LED_ANIMATIONS[parseInt(cmd.args[1])];
  var hz       = Number(cmd.args[2]);
  var duration = Number(cmd.args[3]) * 1000;
  var on       = 0;

  var i = 0;
  self.leds('blank');
  var clearInterval = tic.interval(function() {
    if (!self._ledanimating) return;
    switch (type) {
      case 'blinkRed':
      case 'blinkGreen':
      case 'blinkOrange':
        var n = type === 'blinkRed' ? 1 : type === 'blinkGreen' ? 2 : 3;
        on = Math.sin(TAU * hz * i) > 0 ? n : 0;
        self.leds([on, on, on, on]);
        break;
      case 'blinkStandard':
        self.leds(Math.sin(TAU * hz * i) > 0 ? 'standard' : 'blank');
        break;
      case 'blinkGreenRed':
        self.leds(Math.sin(TAU * hz * i) > 0 ? 'green' : 'red');
        break;
      default:
        self.leds(type);
        break;
      // todo: handle other leds animations
    }
    i += 0.01;
  }, 100);

  self._ledanimating = true;
  tic.timeout(function() {
    clearInterval();
    self.leds('standard');
    self._ledanimating = false;
  }, duration);
};

function setxyz(item, x, y, z) {
  if (arguments.length < 3) {
    y = x; z = x;
  }
  item.x = x; item.y = y; item.z = z;
}

// animate values to produce smoother results
function anim(t, from, to, d) {
  var should = to > 0
    ? from < to ? true : false
    : from > to ? true : false;
  if (!should) return from;
  t /= d || 100;
  return -to * t * (t - 2) + from;
};

var TAU = Math.PI * 2;
function deg2Rad(deg) { return deg * (Math.PI / 180); }
