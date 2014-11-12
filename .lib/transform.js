var PassThrough = require('stream').PassThrough;

function extend( dest, source ) {
	for ( var p in source ) {
		dest[p] = source[p];
	}
	return dest;
}

function newStream( options, tranform, flush ) {
	var stream = new PassThrough( options || {} );
	stream._transform = tranform;
	if ( flush ) { stream._flush = flush; }
	return stream;
}

function wrap( construct ) {
	return function( options, tranform, flush ) {
		if ( typeof options === 'function' ) {
			flush = tranform;
			tranform = options;
			options = {};
		}
		return construct( options, tranform, flush );
	}
}

module.exports = wrap(function( options, tranform, flush ) {
	return newStream( options, tranform, flush );
});

module.exports.each = wrap(function( options, tranform, flush ) {
	options = extend( {objectMode: true, highWaterMark: 16}, options || {} );
	return newStream( options, tranform, flush );
});