var code = require('fs').readFileSync('./ks-template.js', 'utf8') + '';
var start = Date.now();
var vars = extract( code );
var time = Date.now() - start;


console.log( time );
//console.log( vars );

function noop() {
	return true;
}

function extract( source, filter ) {
	var KEYWORDS = 'break|case|catch|continue|debugger|default|delete|do|else|false' +
			'|finally|for|function|if|in|instanceof|new|null|return|switch|this' +
			'|throw|true|try|typeof|var|void|while|with' +

			// reserved
			'|abstract|boolean|byte|char|class|const|double|enum|export|extends' +
			'|final|float|goto|implements|import|int|interface|long|native' +
			'|package|private|protected|public|short|static|super|synchronized' +
			'|throws|transient|volatile' +

			// ECMA 5 - use strict
			'|arguments|let|yield' +

			'|undefined'

		, rtrim = /^[\x20\t\n\r\f]*|[\x20\t\n\r\f]*$/
		, rquoted = /'[^']*?'|"[^"]*?"/gm
		, rnoise = /\\\/|\\\/\*|\[.*?(\/|\\\/|\/\*)+.*?\]/g
		, rtailreg = /\/[gim]*/g
		, rregexp = /\/[^\/]*?\/[gim]*?/g
		, rattribute = /[\x20\t\n\r\f]*\.[\x20\t\n\r\f]*[$\w\.]+/g
		, rcomment = /\/\*(?:.|\n)*?\*\/|\/\/[^\n]*\n|\/\/[^\n]*$/g
		, rspliter = /[^\w$]+/g
		, rkeyword = new RegExp( '\\b' + KEYWORDS.replace(/\|/g, '\\b|\\b') + '\\b', 'g' )
		, rnumber = /\b\d[^,]*/g
		, rtrimcomma = /^,+|,+$|(,)+/g;

	var ret = {}, i = -1, p;
	// remove all string
	source = source.replace( rquoted, '' )
	// remove .xxx operations
	.replace( rattribute, '' )
	// remove regexp qualifier
	.replace( rtailreg, '/' )
	// remove noise regexp characters for remove comments
	.replace( rnoise, ' ' )
	// remove all comment safely
	.replace( rcomment, '' )
	// remove all regexp
	.replace( rregexp, '' )
	// split out variable
	.replace( rspliter, ',' )
	// avoding define keywords
	.replace( rkeyword, '' )
	// remove value assignment or invalid variable
	.replace( rnumber, '' )
	// remove redundant comma
	.replace( rtrimcomma, '$1' );

	source = source ? source.split(',') : [];
	filter = filter || noop;

	while ( (p = source[++i]) ) {
		if ( filter(p) ) {
			ret[p] = 1;
		}
	}

	return ret;
}