// 1. LIBRARIES
// - - - - - - - - - - - - - - -

var $        = require('gulp-load-plugins')();
var argv     = require('yargs').argv;
var gulp     = require('gulp');
var del      = require('del');
var sequence = require('run-sequence');
var less     = require('gulp-less');
var rename   = require('gulp-rename');

// Check for --production flag
var isProduction = !!(argv.production);

// Check for browser compmatibility
var browsers = ['last 2 versions', 'ie 10'];

// 2. FILE PATHS
// - - - - - - - - - - - - - - -

var paths = {
  assets: [
    './src/**/*.*',
    '!./src/templates/**/*.*',
    '!./src/assets/{less,scss,js}/**/*.*',
  ],
  fonts: [
    'bower_components/font-awesome/fonts/*.{eot,woff,ttf,svg,otf,woff2}',
  ],
  // Less will check these folders for files when you use @import.
  less: [
    'src/assets/less/weed'
    // 'bower_components/foundation-icon-fonts'
  ],
  sass: [],
  css: [],
  boostrap: [
    'bower_components/bootstrap/less'
  ],
  weedJS: [
    'bower_components/hammerjs/hammer.js',
    'bower_components/ng-dialog/js/ngDialog.js',
    './src/assets/js/weed.js',
    './src/assets/js/core/*.js',
    './src/assets/js/vendors/*.js',
    './src/assets/js/components/**/*.js'
  ]
}

// 3. TASKS
// - - - - - - - - - - - - - - -

// Cleans the dist directory
gulp.task('clean', function() {
  return del(['dist']);
});

gulp.task('clean:temp', function() {
  return del(['dist/temp']);
});

// Copies everything in the src folder except templates, Less, Sass, and JS
gulp.task('copy', function() {
  return gulp.src(paths.assets, {
    base: './src/'
  })
    .pipe(gulp.dest('./dist'))
  ;
});

// Copies fonts
gulp.task('copy:fonts', function() {
  return gulp.src(paths.fonts)
    .pipe(gulp.dest('./dist/assets/fonts'))
  ;
});

// Compiles the Weed directive partials into a single JavaScript file
gulp.task('copy:weed', function(cb) {
  gulp.src('src/assets/js/components/**/*.html')
    .pipe($.ngHtml2js({
      prefix: 'components/',
      moduleName: 'weed',
      declareModule: false
    }))
    .pipe($.uglify())
    .pipe($.concat('templates.js'))
    .pipe(gulp.dest('./dist/assets/js'))
  ;

  cb();
});

// Compiles Sass
gulp.task('sass', function () {
  return gulp.src('src/assets/scss/weed.scss')
    .pipe($.sass({
      includePaths: paths.sass,
      outputStyle: (isProduction ? 'compressed' : 'nested'),
      errLogToConsole: true
    }))
    .pipe($.autoprefixer({
      browsers: browsers
    }))
    .pipe(rename('sass.css'))
    .pipe(gulp.dest('./dist/temp'))
  ;
});

// Compile Less
gulp.task('less', ['sass'], function(){
  return gulp.src('src/assets/less/weed.less')
      .pipe(less({
        paths: paths.less
      }))
      .pipe($.autoprefixer({
        browsers: browsers
      }))
      .pipe(rename('less.css'))
      .pipe(gulp.dest('dist/temp'));
});

// Compile Bootstrap
gulp.task('bootstrap', ['less'], function(){
  return gulp.src('src/assets/less/bootstrap.less')
      .pipe(less({
        paths: paths.boostrap
      }))
      .pipe($.autoprefixer({
        browsers: browsers
      }))
      .pipe(rename('bootstrap.css'))
      .pipe(gulp.dest('dist/temp'));
});

// Concat CSS
gulp.task('css', ['bootstrap'], function(cb){
  var minifyCss = $.if(isProduction, $.minifyCss());

  return gulp.src(['dist/temp/bootstrap.css', 'dist/temp/sass.css', 'dist/temp/less.css'].concat(paths.css))
    .pipe($.concat('weed.css'))
    .pipe(minifyCss)
    .pipe(gulp.dest('dist/assets/css/'));
});

// Update CSS
gulp.task('css:update', function(cb){
  sequence('css', 'clean:temp');
  cb();
});

// Compiles and copies the Weed JavaScript, as well as your app's custom JS
gulp.task('uglify', ['uglify:weed'])

gulp.task('uglify:weed', function(cb) {
  var uglify = $.if(isProduction, $.uglify()
    .on('error', function (e) {
      console.log(e);
    }));

  return gulp.src(paths.weedJS)
    .pipe(uglify)
    .pipe($.concat('weed.js'))
    .pipe(gulp.dest('./dist/assets/js/'))
  ;
});


// Starts a test server, which you can view at http://localhost:8079
gulp.task('server', ['build'], function() {
  return gulp.src('.')
    .pipe($.webserver({
      port: 8079,
      host: 'localhost',
      livereload: true,
      open: true
    }))
  ;
});

// Builds your entire app once, without starting a server
gulp.task('build', function(cb) {
  return sequence('clean', ['copy', 'copy:fonts', 'copy:weed', 'css', 'uglify'], 'clean:temp', cb);
});

// Default task: builds your app, starts a server, and recompiles assets when they change
gulp.task('default', ['server'], function () {

  // Watch less files
  gulp.watch(['src/assets/less/**/*'], ['css:update']);

  // Watch scripts
  gulp.watch([
    'src/assets/js/**'
    ],
    ['copy:weed', 'uglify']);
});
