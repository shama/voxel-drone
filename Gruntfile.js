module.exports = function(grunt) {

  grunt.initConfig({
    watch: {
      files: ['index.js'],
      tasks: ['default']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', function() {
    var done = this.async();
    grunt.util.async.forEachSeries([
      //'cp -R ./node_modules/voxel-engine/textures/ ./example/textures/',
      'cp -R ./textures/ ./example/textures/',
      'browserify example/index.js -o example/bundle.js',
      'node example/server',
    ], function(cmd, next) {
      grunt.log.writeln('> ' + cmd);
      require('child_process').exec(cmd, {stdio:'inherit'}, function(err, stdout, stderr) {
        if (err || stderr) return next(err || new Error(stderr));
        if (stdout) grunt.log.writeln(stdout);
        next();
      });
    }, done);
  });

  // move example for gh-pages
  grunt.registerTask('gh-pages', function() {
    var done = this.async();
    require('child_process').exec('cp -R ./example/* ./', {stdio:'inherit'}, function(err, stdout, stderr) {
      if (err || stderr) return next(err || new Error(stderr));
      if (stdout) grunt.log.writeln(stdout);
      done();
    });
  });
};
