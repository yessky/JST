var mixin = require('./.lib/mixin')
	, gulp = require('gulp')
	, gutil = require('gulp-util')
	, minifyJS = require('./.lib/minify-js').gulp
	, rename = require('gulp-rename')
	, fslib = require('./.lib/fs')
	, jshint = require('gulp-jshint');

// # default task, lint and compress

gulp.task('default', function() {
	return gulp.src( './src/*.js' )
		.pipe( jshint() )
		.pipe( jshint.reporter('default') )
		.pipe( jshint.reporter('fail') )
		.pipe( minifyJS() )
		.pipe( rename({suffix: '.min'}) )
		.pipe( gulp.dest('./dist/') )
		.on( 'error', gutil.log );
});

// # lint files

gulp.task('lint', function() {
	return gulp.src( './src/*.js' )
		.pipe( jshint() )
		.pipe( jshint.reporter('default') )
		.pipe( jshint.reporter('fail') )
		.on( 'error', gutil.log );
});

// # run mocha tests on phantom

gulp.task('assert', function () {
	return gulp.src( 'spec/runner.html' )
		.pipe( testRunner({reporter: 'spec'}) )
		.on( 'error', gutil.log );
});

// # clean last build

gulp.task('clean', function (done) {
	var def = fslib.rmdir('./dist');
	def.then( done, gutil.log );
	return def.promise;
});

// # watch

gulp.task('watch', function() {
	return gulp.watch( './app/**/*.{html,js,css,png,jpg,jpeg,gif,ico}', ['livereload'] );
});

// #############################################
// # combined tasks

gulp.task('build', ['clean', 'lint', 'assert', 'build-js', 'build-css', 'build-html', 'build-image']);

gulp.task('release', ['build'], function(done) {
	// your logic here
});