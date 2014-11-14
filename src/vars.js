var code = require('fs').readFileSync('./ks-template.js', 'utf8') + '';
var start = Date.now();
var vars = extract( code );
var time = Date.now() - start;


console.log( time );
console.log( vars );

function extract( source ) {
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

	for ( peek in funcs ) {
		if ( peek in words ) {
			delete words[ peek ];
		}
	}

	return words;

	function peekWord() {
		var c = source.substring( index - 2, index - 1),
			rest = source.slice( index - 1 ),
			word = rest.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/)[0];

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
		return /\s/.test( peek );
	}

	function isQuote() {
		return peek === '"' || peek === '\'';
	}

	function isWord() {
		return /[a-zA-Z_$]/.test( peek );
	}
}