/*
 * JST - Light and Fast JavaScript Template Engine
 * Copyright (C) 2013 - 2014 aaron.xiao
 * Author: aaron.xiao <admin@veryos.com>
 * Version: 2.0.0-pre
 * Release: 2013/08/26
 * License: MIT LICENSE
 */
(function( global ) {
	var JST = {}

		, jst_parser

		, settings = {
			openTag: '<%',
			closeTag: '%>'
		}

		, templateCache = {}

		, ERROR_TYPES = {
			'1': 'JST SyntaxError'
			, '2': 'JST RenderError'
		}

		, rtrim = /^[\x20\t\n\r\f]*|[\x20\t\n\r\f]*$/
		, rassign = /=\s*([^:]+)(?::([a-zA-Z$_][\w$]*))?$/
		, rinclude = /#include\s+('[\w$-]+'|"[\w$-]+")(\s*,\s*([a-zA-Z$_][\w$]*))?\s*$/

		, letters = '0123456789AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';

	function mixin( accepter, sender ) {
		var prop;
		for ( prop in sender ) {
			accepter[prop] = sender[prop];
		}
		return accepter;
	}

	function sprintf( str, arr ) {
		return str.replace(/\$\{(\d+)\}/g, function( a, b ) {
			return arr[b];
		});
	}

	function uid() {
		var sid = '', i = 8;
		while ( i-- ) {
			sid += letters.charAt( parseInt(Math.random() * 62) );
		}
		return '$_' + sid;
	}

	function debug( source ) {
		var pass = true;
		try {
			new Function( 'data,lang,filters', source );
		} catch (e) {
			pass = false;
		}
		return pass;
	}

	function noop( value ) {
		return true;
	}

	function ErrorCtor( e ) {
		Error.call( this );
		mixin( this, e );
	}

	ErrorCtor.prototype = new Error();

	function die( id, source, pos, message ) {
		var tkn = source.split( settings.openTag ),
			line = tkn.slice( 0, pos - 1 ).join('').split( /\n/g ).length - 1;

		throw new ErrorCtor({
			name: ERROR_TYPES[id],
			line : line,
			source: '<%' + tkn.slice( pos - 1, pos ).join( '<%' ),
			message: message
		});
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

		function isWhiteSpace() {
			return /[\x20\t\n\r\f]/.test( peek );
		}

		function isQuote() {
			return peek === '"' || peek === '\'';
		}

		function isWord() {
			return /[a-zA-Z_$]/.test( peek );
		}
	}

	function JST_Complier( source ) {
		var prefix = uid(), refsMap;
		this.source = source;
		this.output = '';
		this.vars = {};
		this.pos = 0;

		refsMap = this.refsMap = {};
		refsMap[this.dataRef = prefix + '_D'] = 1;
		refsMap[this.langRef = prefix + '_L'] = 1;
		refsMap[this.filterRef = prefix + '_F'] = 1;
		refsMap[this.outRef = prefix + '_T'] = 1;
		refsMap[this.posRef = prefix + '_P'] = 1;
	}

	JST_Complier.cache = {};

	JST_Complier.compile = function( id, source ) {
		if ( !JST_Complier.cache[ id + ' ' ] ) {
			JST_Complier.cache[ id + ' ' ] = new JST_Complier( source ).compile();
		}
		return JST_Complier.cache[ id + ' ' ];
	};

	JST_Complier.prototype.compile = function() {
		var parser = JST.parser,
			refsMap = this.refsMap,
			i = -1,
			def = '',
			body = '',
			logics = '',
			vars, pre, parts, part, text, logic, closeTag;

		closeTag = settings.closeTag;
		parts = this.source.split( settings.openTag );

		while ( (part = parts[++i]) ) {
			part = part.split( closeTag );

			if ( part.length === 1 ) {
				text = part[0];
				logic = false;
			} else {
				text = part[1];
				logic = part[0];
			}

			if ( logic ) {
				this.pos = i;
				logic = parser.parse( logic, this );
				logics += logic;
				body += sprintf( '${0}=${1};\n', [this.posRef, i] ) + logic;
			}

			if ( text ) {
				body += sprintf( '${0}+="${1}";', [this.outRef, lang.stringify(text)] );
			}
		}

		// extract variables
		vars = this.vars = extract( logics, function( name ) {
			return refsMap.hasOwnProperty( name );
		} );
		console.log(vars);

		pre = sprintf( 'var ${0}=data,${1}="",${2}=lang,${3}=0,${4}=filters;data=lang=filters=undefined;' , [this.dataRef, this.outRef, this.langRef, this.posRef, this.filterRef] );

		// define variables
		for ( i in vars ) {
			if ( vars.hasOwnProperty(i) ) {
				body = sprintf( 'var ${0}=${1}["${0}"];', [i, this.dataRef] ) + body;
			}
		}

		// standard compile output
		this.output = sprintf( '"use strict";${0}try{${1}}catch(ex){var e=new Error();e.message=ex.message;e.pos=${2};throw e;}return ${3};', [pre, body, this.posRef, this.outRef ] );

		// used for debug
		body = sprintf( '"use strict";${0}${1}return ${2}', [pre, body, this.outRef] );

		try {
			return new Function( 'data,lang,filters', this.output );
		} catch (e) {
			var tkns = body.split( new RegExp('\\' + this.posRef + '=\\d+;\\n') ),
				pos = 1, count = tkns.length;

    		while ( pos < count ) {
    			if ( debug( tkns.slice( 0, pos ).join('') ) ) {
    				pos += 1;
    			} else {
    				break;
    			}
    		}

			die( 1, this.source, pos, e.message );
		}
	};

	JST_Complier.prototype.append = function( value ) {
		return sprintf( '${0}+=${1};', [this.outRef, value] );
	};

	JST_Complier.prototype.filter = function( name, value ) {
		return sprintf( '${0}.${1}(${2})', [this.filterRef, name, value] );
	};

	JST_Complier.prototype.include = function( name, value ) {
		value = value || this.dataRef;
		return sprintf( '${0}.include(${1},${2})', [this.langRef, name, value] );
	};

	JST_Complier.prototype.die = function( message ) {
		return die( 1, this.source, this.pos, message );
	};

	// default parser
	jst_parser = {
		parse: function( source, compiler ) {
			var i = -1, value, name;

			source = source.replace( rtrim, '' );

			if ( source.indexOf('=') === 0 ) {
				// syntax validate for assignment
				if ( !(value = source.match( rassign )) ) {
					compiler.die( 'invalid assignment or apply filter incorrectly' );
				}

				name = value[2];
				value = value[1];

				if ( name ) {
					value = compiler.filter( name, value );
				}

				source = compiler.append( value );
			} else if ( source.indexOf('#include') === 0 ) {
				// syntax validate for include
				if ( !(value = source.match( rinclude )) ) {
					compiler.die( 'invalid arguments for include' );
				}

				value = compiler.include( value[1], value[3] );
				source = compiler.append( value );
			} else {
				// avoid potential syntax error
				source += '\n';
			}

			return source;
		}
	};

	var compilerCache = {};

	var helpers = {
			log: function( msg ) {
				global.console && global.console.log( msg );
			},
			alert: function( msg ) {
				global.alert && global.alert( msg );
			}
		}
		, lang = {
			stringify: function( value ) {
				return typeof value !== 'string' ? value :
					value.replace(/("|\\)/g, '\\$1' )
					.replace( /\r/g, '\\r' ).replace( /\n/g, '\\n' );
			},
			include: function( id, data ) {
				return JST.render( id, data );
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

	JST.settings = settings;

	JST.parser = jst_parser;

	JST.cache = function cacheTemplate( id, templateString ) {
		if ( templateString ) {
			templateCache[ id + ' ' ] = templateString;
		}
		return templateCache[ id + ' ' ];
	};

	JST.filter = function registerFilter( name, handler ) {
		filters[name] = function( value ) {
			return handler.call( filters, value );
		};
	};

	JST.render = function renderTemplate( id, data ) {
		var source = templateCache[id + ' '],
			render, context;

		if ( !source ) {
			throw new Error( 'could not find specified template "' + id + '"' );
		} else {
			render = JST_Complier.compile( id, source );
			context = mixin( {}, helpers );

			try {
				return render.call( context, data, lang, filters );
			} catch (e) {
				die( 2, source, e.pos + 1, e.message );
			}
		}
	};

	JST.clear = function clearCache() {
		JST_Complier.cache = templateCache = {};
	};

	// EXPOSE API
	if ( typeof define === 'function' && (define.amd || define.cmd) ) {
		define(function() { return JST; });
	} else {
		global.JST = JST;
	}
}( this, undefined ));