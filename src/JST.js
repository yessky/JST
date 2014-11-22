/*
 * JST - Light and Fast JavaScript Template Engine
 * Copyright (C) 2013 - 2014 aaron.xiao
 * Author: aaron.xiao <admin@veryos.com>
 * Version: 2.0.0-pre
 * Release: 2014/11/20
 * License: MIT LICENSE
 */
(function( global ) {

var settings = {
		openTag: '<%',
		closeTag: '%>'
	}

	, dummy = {}
	, templateCache = createCache()
	, renderCache = createCache()
	, toString = Object.prototype.toString

	, JST_SyntaxError = 'JST_SyntaxError'
	, JST_RenderError = 'JST_RenderError'

	, rtrim = /^[\x20\t\n\r\f]*|[\x20\t\n\r\f]*$/
	, ridentifier = /^#[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s)/
	, rassign = /^=\s*([^:]+)(?:\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?\s*$/
	, rargv = /('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|[a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*,\s*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|[a-zA-Z_$][a-zA-Z0-9_$]*))*/;

function isFunction( fn ) {
	return toString.call( fn ) === '[object Function]';
}

function mixin( accepter, sender ) {
	var prop;
	for ( prop in sender ) {
		accepter[prop] = sender[prop];
	}
	return accepter;
}

function sprintf( str, data ) {
	return str.replace(/\$\{(\d+)\}/g, function( a, b ) {
		return data[b];
	});
}

function uid() {
	return Number((Math.random() + '').slice(2)).toString(32);
}

function createCache( size ) {
	var keys = [], cache;
	size = Number( size ) || 50;
	return (cache = function( key, value ) {
		key = key + ' ';
		if ( keys.push(key) > size ) {
			delete cache[ keys.shift() ];
		}
		return ( cache[key] = value );
	});
}

function debug( source ) {
	var pass = true;
	try {
		new Function( '$D,$L,$F', source );
	} catch (e) {
		pass = false;
	}
	return pass;
}

function dig( source, pos, delimiter ) {
	var sep = delimiter || settings.openTag
		, part = source.split( sep );
	return {
		source: sep + part.slice( pos - 1, pos ).join( sep )
		, line: part.slice( 0, pos - 1 ).join('').split( /\n/g ).length - 1
	}
}

function die( name, info ) {
	var jst_error = new Error( info.message );
	jst_error.name = name;
	jst_error.line = info.line;
	jst_error.source = info.source;
	throw jst_error;
}

function stringify( value ) {
	if ( isFunction(value) ) {
		value = value();
	}
	return typeof value === 'string' || value instanceof String ?
		value.replace(/("|\\)/g, '\\$1' ).replace( /\r/g, '\\r' ).replace( /\n/g, '\\n' ) : value;
}

// extract variables to from given source code
// see https://github.com/yessky/jsvars
function extract( source, exclude ) {
	var KEYWORDS = {'break':1,'case':1,'catch':1,'continue':1,'debugger':1,'default':1,'delete':1,'do':1,'else':1,'false':1,'finally':1,'for':1,'function':1,'if':1,'in':1,'instanceof':1,'new':1,'null':1,'return':1,'switch':1,'this':1,'throw':1,'true':1,'try':1,'typeof':1,'var':1,'void':1,'while':1,'with':1,'abstract':1,'boolean':1,'byte':1,'char':1,'class':1,'const':1,'double':1,'enum':1,'export':1,'extends':1,'final':1,'float':1,'goto':1,'implements':1,'import':1,'int':1,'interface':1,'long':1,'native':1,'package':1,'private':1,'protected':1,'public':1,'short':1,'static':1,'super':1,'synchronized':1,'throws':1,'transient':1,'volatile':1,'arguments':1,'let':1,'yield':1,'undefined':1};
	var peek = '', index = 0, length = source.length,
		words = {}, funcs = {},  braceStack = [],
		inWord = 0, inRegExp = 0, inFunc = 0, inObject = 0, inTernary = 0, inColon = 0;

	while ( index < length ) {
		read();
		if ( peek === '/' ) {
			read();
			if ( peek === '/' ) {
				index = source.indexOf( '\n', index );
				if ( index === -1 ) {
					index = length;
				}
			} else if ( peek === '*' ) {
				index = source.indexOf( '*/', index );
				if ( index === -1 ) {
					index = length;
				} else {
					index += 2;
				}
			} else {
				if ( !inRegExp ) {
					index--;
					inRegExp = 1;
				}
				peekRegExp();
				inRegExp = 0;
			}
		} else if ( isQuote() ) {
			peekQuote();
		} else if ( isWord() ) {
			peekWord();
			inWord = 1;
		} else if ( peek === '{' ) {
			peekBrace();
		} else if ( peek === '}' ) {
			braceStack.pop();
			inObject = braceStack.length;
		} else if ( peek === '?' ) {
			inTernary = 1;
		} else if ( peek === ':' ) {
			inColon = 1;
		} else if ( peek === '(' ) {
			if ( inFunc ) {
				inFunc = 0;
			}
		}
	}

	for ( peek in words ) {
		if ( (peek in funcs) || exclude(peek) ) {
			delete words[ peek ];
		}
	}

	return words;

	function peekWord() {
		var c = source.substring( index - 2, index - 1),
			rest = source.slice( index - 1 ),
			word = rest.match( /^[a-zA-Z_$][a-zA-Z0-9_$]*/ )[0];

		if ( word === 'function' ) {
			inFunc = 1;
		} else {
			if ( inFunc ) {
				funcs[ word ] = 1;
				inFunc = 0;
			} else if ( c !== '.' && (inTernary || !inObject || inColon) ) {
				if ( !KEYWORDS.hasOwnProperty(word) ) {
					words[ word ] = 1;
				}
			}
		}

		index += word.length - 1;
		inColon = inTernary = 0;
	}

	function peekBrace() {
		var rest = source.slice( index - 1 ),
			m = rest.match( /^\{[\x20\t\n\r\f]*[a-zA-Z_$][a-zA-Z0-9_$]*[\x20\t\n\r\f]*:/ );

		if ( m ) {
			braceStack.push( inObject = 1 );
			index += m[0].length;
		}
	}

	function peekQuote() {
		var c = peek;
		index = source.indexOf( peek, index );

		if ( index === -1 ) {
			index = length;
		} else if ( source.charAt(index - 1) !== '\\' ) {
			index++;
		} else {
			while ( index < length ) {
				read();
				if ( peek === '\\' ) {
					index++;
				} else if ( peek === c ) {
					index++;
					break;
				}
			}
		}
	}

	function peekRegExp() {
		while ( index < length ) {
			read();
			if ( peek === '\\' ) {
				index++;
			} else if ( peek === '/' ) {
				while ( index < length ) {
					read();
					if ( 'gim'.indexOf( peek ) === -1 ) {
						break;
					}
				}
				break;
			} else if ( peek === '[' ) {
				while ( index < length ) {
					read();
					if ( peek === '\\' ) {
						index++;
					} else if ( peek === ']' ) {
						break;
					}
				}
			}
		}
	}

	function read() {
		peek = source.charAt( index++ );
	}

	function isQuote() {
		return peek === '"' || peek === '\'';
	}

	function isWord() {
		return /[a-zA-Z_$]/.test( peek );
	}
}

var TKN_ECHO = '${0}+=${1};'
	, TKN_INVOKE = '${0}.${1}(${2})'
	, TKN_LINE = '${0}=${1};\n'
	, TKN_CHARS = '${0}+="${1}";'
	, TKN_VAR = 'var ${0}=${1}["${0}"];'
	, FN_HEAD = 'var ${0}=$D,${1}="",${2}=$L,${3}=0,${4}=$F;$D=$L=$F=undefined;'
	, FN_MAIN = '"use strict";${0}try{${1}}catch(e){e.pos=${2};throw e;}return ${3};'

	, lang = {
		include: function( id, data ) {
			return JST( id, data );
		}
		, log: function( value ) {
			global.console && global.console.log( value );
		}
		, alert: function( value ) {
			global.alert( value );
		}
	}
	, filters = {
		escape: function( value ) {
			return typeof value === 'string' || value instanceof String ?
				value.replace( /&/g, '\x26amp;' )
				.replace( /</g, '\x26lt;' )
				.replace( />/g, '\x26gt;' )
				.replace( /"/g, '\x26quot;' )
				.replace( /'/g, '\x26#39;' ) : value;
		}
	};

function JST_Complier( options ) {
	var id, vars;
	mixin( this, options );
	id = this.id = uid();
	vars = this.vars = {};
	this.line = 1;
	vars[ this.dataRef = '$D_' + id ] = 1;
	vars[ this.langRef = '$L_' + id ] = 1;
	vars[ this.filterRef = '$F_' + id ] = 1;
	vars[ this.echoRef = '$E_' + id ] = 1;
	vars[ this.lineRef = '$P_' + id ] = 1;
}

JST_Complier.prototype.parse = function( source ) {
	var i = -1, c, rest, value, name, argv;

	source = source.replace( rtrim, '' );
	c = source.charAt( 0 );

	if ( c === '=' ) {
		if ( (value = source.match( rassign )) ) {
			name = value[ 2 ];
			value = value[ 1 ];

			if ( name ) {
				value = sprintf( TKN_INVOKE, [ this.filterRef, name, value ] );
			}
		} else {
			value = source;
		}

		source = sprintf( TKN_ECHO, [ this.echoRef, value ] );
	} else if ( c === '#' ) {
		if ( !(value = source.match( ridentifier )) ) {
			this.die( 'invalid identifier' );
		}

		name = value[ 0 ].slice( 1 );
		rest = source.slice( name.length + 1 ).replace( rtrim, '' );
		argv = [];

		if ( (value = rest.match( rargv )) ) {
			value.shift();
			while ( (c = value.shift()) ) {
				argv.push( c );
			}
		}

		if ( name === 'include' && !argv[1] ) {
			argv[1] = this.dataRef;
		}

		value = sprintf( TKN_INVOKE, [ this.langRef, name, argv.join(',') ] );
		source = name === 'include' ? sprintf( TKN_ECHO, [ this.echoRef, value ] ) : value + ';';
	} else {
		// avoid potential syntax error
		source += '\n';
	}

	return source;
};

JST_Complier.prototype.compile = function( source ) {
	var vars = this.vars
		, i = -1
		, code = ''
		, head = ''
		, body = ''
		, output = ''
		, parts, part, text, logic;

	this.source = source;
	parts = source.split( this.openTag );

	while ( (part = parts[++i]) ) {
		part = part.split( this.closeTag );

		if ( part.length === 1 ) {
			text = part[0];
			logic = false;
		} else {
			text = part[1];
			logic = part[0];
		}

		if ( logic ) {
			logic = this.parse( logic );
			body += sprintf( TKN_LINE, [ this.lineRef, i ] ) + logic;
			code += logic;
			this.line += 1;
		}

		if ( text ) {
			body += sprintf( TKN_CHARS, [ this.echoRef, stringify(text) ] );
		}
	}

	// extract variables and define them
	for ( i in extract(code, function( name ) {
			return vars.hasOwnProperty( name );
		}) ) {
		if ( !dummy.hasOwnProperty(i) ) {
			body = sprintf( TKN_VAR, [ i, this.dataRef ] ) + body;
		}
	}

	head = sprintf( FN_HEAD, [ this.dataRef, this.echoRef, this.langRef, this.lineRef, this.filterRef ] );
	output = sprintf( FN_MAIN, [ head, body, this.lineRef, this.echoRef ] );

	try {
		return new Function( '$D,$L,$F', output );
	} catch (e) {
		body = sprintf( '"use strict";${0}${1}return ${2}', [ head, body, this.echoRef ] );
		parts = body.split( new RegExp('\\' + this.lineRef + '=\\d+;\\n') );
		for ( i = 1; debug( parts.slice(0, i).join('') ); i++ ) {}
		mixin( e, dig( source, i, this.openTag ) );
		die( JST_SyntaxError, e );
	}
};

JST_Complier.prototype.die = function( message ) {
	var e = dig( source, this.line, this.openTag );
	e.message = message;
	return die( JST_SyntaxError, e );
};

function JST( id, data ) {
	var render = renderCache[ id + ' ' ]
		, source = templateCache[ id + ' ' ];

	if ( !render ) {
		if ( !source ) {
			throw new Error( 'Not found template \'' + id + '\', did you use \'JST.cache\' to pull it in?' );
		}
		renderCache( id, render = JST.compile(source) );
	}

	try {
		return render( data || {}, lang, filters );
	} catch (e) {
		if ( !e.source ) {
			source = dig( source, e.pos + 1 );
			e.source = source.source;
			e.line = source.line;
		}
		die( JST_RenderError, e );
	}
};

JST.settings = settings;

JST.cache = function( id, source ) {
	if ( source ) {
		templateCache( id, source );
	}
	return templateCache[ id + ' ' ];
};

JST.compile = function( source, options ) {
	options = mixin( options || {}, settings );
	return new JST_Complier( options ).compile( source );
};

JST.render = function( source, data ) {
	var render = isFunction(source) ? source : JST.compile( source );
	return render( data, lang, filters );
};

JST.filter = function( name, fn ) {
	if ( isFunction(fn) ) {
		filters[ name ] = function( value ) {
			return fn.call( filters, value );
		};
	}
};

// EXPOSE API

if ( typeof module !== 'undefined' && module.exports ) {
	module.exports = JST;
} else if ( typeof define === 'function' && (define.amd || define.cmd) ) {
	define( function() { return JST; } );
} else {
	global.JST = JST;
}

}( this, undefined ));