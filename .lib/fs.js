var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var Deferred = require('./Deferred');

var shimmedCallback = function( def ) {
	return function( err, result ) {
		if ( err ) {
			def.reject( err );
		} else {
			def.resolve( result );
		}
	}
}

exports.mkdir = function( dir, mode ) {
	if ( fs.existsSync(dir) ) { return; }

	if ( !mode ) {
		mode = parseInt('0777', 8) & ( ~process.umask() );
	}

	dir.split(path.sep).reduce(function( parts, part ) {
		parts += part + '/';
		var sub = path.resolve( parts );
		if ( !fs.existsSync(sub) ) {
			fs.mkdirSync( sub, mode );
		}
		return parts;
	}, '');
};

exports.rmdir = function( dir ) {
	var def = new Deferred();
	if ( fs.existsSync(dir) ) {
		child_process.exec( 'rm -rf ' + dir, shimmedCallback(def) );
	} else {
		def.resolve();
	}
	return def.promise;
};

exports.rmdirSync = function rmdirSync( dir ) {
	if ( fs.existsSync(dir) ) {
		(fs.readdirSync( dir ) || []).forEach(function( item, index ) {
			var cur = dir + '/' + item;
			if ( fs.statSync(cur).isDirectory() ) {
				rmdirSync( cur );
			} else {
				fs.unlinkSync( cur );
			}
		});
		fs.rmdirSync( dir );
	}
};

exports.read = function( filename, isJS ) {
	var s = fs.readFileSync( filename, {encoding: 'utf8'} );
	s = String( s );
	return isJS ? new Function('', 'return (' + s + ');')() : s;
};

exports.append = function( filename, data ) {
	fs.appendFileSync( filename, data, {encoding: 'utf8'} );
};

exports.appendSync = function( filename, data ) {
	var def = new Deferred();
	fs.appendFile( filename, data, {encoding: 'utf8'}, shimmedCallback(def) );
	return def.promise;
};

exports.writeSync = function( filename, data ) {
	var dir = path.dirname( filename );
	exports.mkdir( dir );
	fs.writeFileSync( filename, data, {encoding: 'utf8'} );
};

exports.write = function( filename, data ) {
	var dir = path.dirname( filename ),
		def = new Deferred();
	exports.mkdir( dir );
	fs.writeFile( filename, data, {encoding: 'utf8'}, shimmedCallback(def) );
	return def.promise;
};