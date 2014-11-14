                                                                                                                                                                                                           
(function( global ) {
	var JST = {}

		, jst_parser

		, settings = {
			openTag:     ,
			closeTag:     
		}

		, templateCache = {}

		, KEYWORDS =                                                                   +
			                                                                     +
			                                             +

			            
			                                                                     +
			                                                                +
			                                                                    +
			                             +

			                       
			                       +

			            

		, ERROR_TYPES = {
			   :                  
			,    :                  
		}

		, rtrim =                                     
		, rquoted =                       
		, rnoise =                                          
		, rtailreg =             
		, rregexp =                       
		, rattribute =                                             
		, rcomment =                                                
		, rspliter =            
		, rkeyword = new RegExp(       + KEYWORDS.replace(                ) +      ,     )
		, rnumber =              
		, rtrimcomma =                 

		, rassign =                                        
		, rinclude =                                                                    

		, letters =                                                                 ;

	function mixin( accepter, sender ) {
		var prop;
		for ( prop in sender ) {
			accepter[prop] = sender[prop];
		}
		return accepter;
	}

	function sprintf( str, arr ) {
		return str.replace(                function( a, b ) {
			return arr[b];
		});
	}

	function uid() {
		var sid =   , i = 8;
		while ( i-- ) {
			sid += letters.charAt( parseInt(Math.random() * 62) );
		}
		return      + sid;
	}

	function debug( source ) {
		var pass = true;
		try {
			new Function(                    , source );
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
			line = tkn.slice( 0, pos - 1 ).join(  ).split(       ).length - 1;

		throw new ErrorCtor({
			name: ERROR_TYPES[id],
			line : line,
			source:      + tkn.slice( pos - 1, pos ).join(      ),
			message: message
		});
	}

	                                               
	function extract( source, filter ) {
		var ret = {}, i = -1, p;
		                     
		source = source.replace( rquoted,    )
		                          
		.replace( rattribute,    )
		                           
		.replace( rtailreg,     )
		                                                      
		.replace( rnoise,     )
		                             
		.replace( rcomment,    )
		                     
		.replace( rregexp,    )
		                      
		.replace( rspliter,     )
		                           
		.replace( rkeyword,    )
		                                               
		.replace( rnumber,    )
		                          
		.replace( rtrimcomma,      );

		source = source ? source.split(   ) : [];
		filter = filter || noop;

		while ( (p = source[++i]) ) {
			if ( filter(p) ) {
				ret[p] = 1;
			}
		}

		return ret;
	}

	function JST_Complier( source ) {
		var prefix = uid(), refsMap;
		this.source = source;
		this.output =   ;
		this.vars = {};
		this.pos = 0;

		refsMap = this.refsMap = {};
		refsMap[this.dataRef = prefix +     ] = 1;
		refsMap[this.langRef = prefix +     ] = 1;
		refsMap[this.filterRef = prefix +     ] = 1;
		refsMap[this.outRef = prefix +     ] = 1;
		refsMap[this.posRef = prefix +     ] = 1;
	}

	JST_Complier.cache = {};

	JST_Complier.compile = function( id, source ) {
		if ( !JST_Complier.cache[ id +     ] ) {
			JST_Complier.cache[ id +     ] = new JST_Complier( source ).compile();
		}
		return JST_Complier.cache[ id +     ];
	};

	JST_Complier.prototype.compile = function() {
		var parser = JST.parser,
			refsMap = this.refsMap,
			i = -1,
			def =   ,
			body =   ,
			logics =   ,
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
				body += sprintf(               , [this.posRef, i] ) + logic;
			}

			if ( text ) {
				body += sprintf(                , [this.outRef, lang.stringify(text)] );
			}
		}

		                     
		vars = this.vars = extract( logics, function( name ) {
			return !refsMap.hasOwnProperty( name );
		} );

		pre = sprintf(                                                                                    , [this.dataRef, this.outRef, this.langRef, this.posRef, this.filterRef] );

		                    
		for ( i in vars ) {
			if ( vars.hasOwnProperty(i) ) {
				body = sprintf(                         , [i, this.dataRef] ) + body;
			}
		}

		                           
		this.output = sprintf(                                                                                                              , [pre, body, this.posRef, this.outRef ] );

		                  
		body = sprintf(                                   , [pre, body, this.outRef] );

		try {
			return new Function(                    , this.output );
		} catch (e) {
			var tkns = body.split( new RegExp(     + this.posRef +            ) ),
				pos = 1, count = tkns.length;

    		while ( pos < count ) {
    			if ( debug( tkns.slice( 0, pos ).join(  ) ) ) {
    				pos += 1;
    			} else {
    				break;
    			}
    		}

			die( 1, this.source, pos, e.message );
		}
	};

	JST_Complier.prototype.append = function( value ) {
		return sprintf(              , [this.outRef, value] );
	};

	JST_Complier.prototype.filter = function( name, value ) {
		return sprintf(                  , [this.filterRef, name, value] );
	};

	JST_Complier.prototype.include = function( name, value ) {
		value = value || this.dataRef;
		return sprintf(                          , [this.langRef, name, value] );
	};

	JST_Complier.prototype.die = function( message ) {
		return die( 1, this.source, this.pos, message );
	};

	                  
	jst_parser = {
		parse: function( source, compiler ) {
			var i = -1, value, name;

			source = source.replace( rtrim,    );

			if ( source.indexOf(   ) === 0 ) {
				                                  
				if ( !(value = source.match( rassign )) ) {
					compiler.die(                                                  );
				}

				name = value[2];
				value = value[1];

				if ( name ) {
					value = compiler.filter( name, value );
				}

				source = compiler.append( value );
			} else if ( source.indexOf(          ) === 0 ) {
				                               
				if ( !(value = source.match( rinclude )) ) {
					compiler.die(                                 );
				}

				value = compiler.include( value[1], value[3] );
				source = compiler.append( value );
			} else {
				                                
				source +=     ;
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
				return typeof value !==          ? value :
					value.replace(                  )
					.replace(              ).replace(              );
			},
			include: function( id, data ) {
				return JST.render( id, data );
			}
		}
		, filters = {
			escape: function( value ) {
				return typeof value ===          || value instanceof String ?
					value.replace(                  )
					.replace(                 )
					.replace(                 )
					.replace(                   )
					.replace(                  ) : value;
			}
		};

	JST.settings = settings;

	JST.parser = jst_parser;

	JST.cache = function cacheTemplate( id, templateString ) {
		if ( templateString ) {
			templateCache[ id +     ] = templateString;
		}
		return templateCache[ id +     ];
	};

	JST.filter = function registerFilter( name, handler ) {
		filters[name] = function( value ) {
			return handler.call( filters, value );
		};
	};

	JST.render = function renderTemplate( id, data ) {
		var source = templateCache[id +    ],
			render, context;

		if ( !source ) {
			throw new Error(                                       + id +     );
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

	              
	if ( typeof define ===            && (define.amd || define.cmd) ) {
		define(function() { return JST; });
	} else {
		global.JST = JST;
	}
}( this, undefined ));