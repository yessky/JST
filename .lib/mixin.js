module.exports = function( dest, source ) {
	for ( var p in source ) {
		if ( !dest.hasOwnProperty(p) ) {
			dest[p] = source[p];
		}
	}
	return dest;
};