var code = require('fs').readFileSync('./ks-template.js', 'utf8') + '';


extract( code );


function extract( source ) {
	var peek = '', index = 0, length = source.length, isRegexp = 0, quotes = [], regexps = [], comments = [], start = 0;

	while ( index < length ) {
		read();
		start = index - 1;
		if ( peek === '/' ) {
			read();
			if ( peek === '/' ) {
				index = source.indexOf( '\n', index );
				if ( index === -1 ) {
					index = length;
				} else {
					comments.push( [start, index] );
				}
			} else if ( peek === '*' ) {
				index = source.indexOf( '*/', index );
				if ( index === -1 ) {
					index = length;
				} else {
					index += 2;
					comments.push( [start, index] );
				}
			} else {
				if ( !isRegexp ) {
					index--;
					isRegexp = 1;
				}
				processRegexp();
				regexps.push( [start, index] );
				isRegexp = 0;
			}
		} else if ( isQuote() ) {
			processQuote();
			quotes.push( [start, index] );
		}
	}

	console.log( quotes.length + ' quotes: ' );
	quotes.forEach(function( q ) {
		source = source.substring( 0, q[0] ) + createSpaces( q[1] - q[0] ) + source.substring( q[1] );
		//console.log( '>>>:' + source.substring( q[0], q[1] ) );
	});
	console.log( comments.length + ' comments: ' );
	comments.forEach(function( q ) {
		//source = source.substring( 0, q[0] ) + createSpaces( q[1] - q[0] ) + source.substring( q[1] );
		//console.log( '>>>:' + source.substring( q[0], q[1] ) );
	});
	console.log( regexps.length + ' regexps: ' );
	regexps.forEach(function( q ) {
		//source = source.substring( 0, q[0] ) + createSpaces( q[1] - q[0] ) + source.substring( q[1] );
		//console.log( '>>>:' + source.substring( q[0], q[1] ) );
	});

	require('fs').writeFileSync('s1.js', source);

	function processQuote() {
		var chr = peek;
		index = source.indexOf( peek, index );
		if ( index === -1 ) {
			index = length;
		} else if ( source.charAt(index - 1) !== peek ) {
			index++;
		} else {
			while ( index < length ) {
				read();
				if ( peek === '\\' ) {
					index++;
				} else if ( peek === chr ) {
					break;
				}
			}
		}
	}

	function processRegexp() {
		while ( index < length ) {
			read();
			if ( peek === '\\' ) {
				index++;
			} else if ( peek === '/' ) {
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
		return /[a-z_$]/i.test( peek );
	}
}

function createSpaces( size ) {
	var b = '';
	while ( size-- ) {
		b += ' ';
	}
	return b;
}

function extract2( source ) {
	var peek = '', index = 0, length = source.length, isRegexp = 0, brackets = [], brace = [];

	while ( index < length ) {
		read();
		if ( isWhiteSpace() ) {
			continue;
		} else if ( peek === '/' ) {
			read();
			//con
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
				if ( !isRegexp ) {
					index--;
					isRegexp = 1;
				}
				processRegexp();
				isRegexp = 0;
			}
		} else if ( isQuote() ) {
			processQuote();
		} else if ( isWord() ) {
			processWord();
		} else if ( peek === '(' ) {
			brackets.push( index - 1 );
		} else if ( peek === ')' ) {

		} else {
			//console.log(source.substring(0, index));
			//break;
		}
	}

	function processWord() {
		var c = source.slice( index - 1 )
			, m = /^[a-z0-9_$]+/.exec( c )[0];

		if ( m === 'var' ) {
			console.log(source.slice(0, index + 1));
			index = length;
		}
	}

	function processQuote() {
		index = source.indexOf( peek, index );
		if ( index === -1 ) {
			index = length;
		} else if ( source.charAt(index - 1) === peek ) {
			processQuote();
		} else {
			index++;
		}
	}

	function processRegexp() {
		while ( index < length ) {
			read();
			if ( peek === '\\' ) {
				index++;
			} else if ( peek === '/' ) {
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
		return /[a-z_$]/i.test( peek );
	}
}