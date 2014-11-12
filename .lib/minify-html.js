var transform = require('./transform'),
	minifyHTML = require('html-minifier').minify;

var options = {
	minifyJS: true,
	minifyCSS: true,
	collapseWhitespace: true
};

module.exports = function( html, opts ) {
	opts = extend( options, opts || {} );
	return minifyHTML( String(html), opts );
};

module.exports.gulp = function( opts ) {
	opts = extend( options, opts || {} );
	return transform.each(function( file, encoding, done ) {
		if ( file.isNull() ) {
            return done( null, file );
        }
        if ( file.isStream() ) {
            var stm = transform.each(
                function( chunk, encoding, done ) {
                    if ( !this._buf ) {
                        this._buf = Buffer('');
                    }
                    this._buf = Buffer.concat([this._buf, chunk], this._buf.length + chunk.length);
                    done();
                },
                function( done ) {
                    this.push( this._buf );
                    done();
                }
            );
            file.contents = file.contents.pipe( stm );
            return done( null, file );
        }
        var contents = minifyHTML( String(file.contents), opts );
        file.contents = new Buffer( contents );
        done( null, file );
	});
};

function extend( dest, src ) {
    for ( var p in src ) {
        dest[p] = src[p];
    }
    return dest;
}
