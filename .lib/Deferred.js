// module:
//		Promise
// summary:
//		Promise base(abstract) class. All promises will be instances of this class.


function Promise() {}

function throwAbstract() {
	throw new TypeError( 'call abstract method' );
}

function extend( dest, source ) {
	var pt = dest.prototype;
	for ( var p in source ) {
		pt[p] = source[p];
	}
	return dest;
}

extend(Promise, {
	then: function( callback, errback, progback ) {
		throwAbstract();
	},

	cancel: function( reason ) {
		throwAbstract();
	},

	isResolved: function() {
		throwAbstract();
	},

	isRejected: function() {
		throwAbstract();
	},

	isFulfilled: function() {
		throwAbstract();
	},

	isCanceled: function() {
		throwAbstract();
	},

	always: function( callback ) {
		return this.then( callback, callback );
	},

	otherwise: function( errback ) {
		return this.then( null, errback );
	},

	toString: function() {
		return '[object Promise]';
	}
});

// module:
//		Deferred
// summary:
//		Deferred base class.

var PROGRESS = 0,
	RESOLVED = 1,
	REJECTED = 2;

var FULFILLED_ERROR_MESSAGE = 'This deferred has already been fulfilled.',
	CANCELED_ERROR_MESSAGE = 'The deferred was cancelled.';

var noop = function() {},
	freezeObject = Object.freeze || noop;

var signalWaiting = function( waiting, type, result ) {
	for ( var i = 0; i < waiting.length; i++ ) {
		signalListener( waiting[i], type, result );
	}
};

var signalListener = function( listener, type, result ) {
	var func = listener[ type ],
		deferred = listener.deferred;

	if ( func ) {
		try {
			var returned = func( result );
			if ( type === PROGRESS ) {
				if ( typeof returned !== 'undefined' ) {
					signalDeferred( deferred, type, returned );
				}
			} else {
				if ( returned && typeof returned.then === 'function' ) {
					listener.cancel = returned.cancel;
					returned.then(
							makeDeferredSignaler( deferred, RESOLVED ),
							makeDeferredSignaler( deferred, REJECTED ),
							makeDeferredSignaler( deferred, PROGRESS ));
					return;
				}
				signalDeferred( deferred, RESOLVED, returned );
			}
		} catch ( e ) {
			signalDeferred( deferred, REJECTED, e );
		}
	} else {
		signalDeferred( deferred, type, result );
	}
};

var makeDeferredSignaler = function( deferred, type ) {
	return function( value ) {
		signalDeferred( deferred, type, value );
	};
};

var signalDeferred = function( deferred, type, result ) {
	if ( !deferred.isCanceled() ) {
		switch( type ) {
			case PROGRESS:
				deferred.progress( result );
				break;
			case RESOLVED:
				deferred.resolve( result );
				break;
			case REJECTED:
				deferred.reject( result );
				break;
		}
	}
};

var Deferred = function( canceler ) {
	var promise = this.promise = new Promise();
	var fulfilled, result;
	var canceled = false;
	var waiting = [];

	this.isResolved = promise.isResolved = function() {
		return fulfilled === RESOLVED;
	};

	this.isRejected = promise.isRejected = function() {
		return fulfilled === REJECTED;
	};

	this.isFulfilled = promise.isFulfilled = function() {
		return !!fulfilled;
	};

	this.isCanceled = promise.isCanceled = function() {
		return canceled;
	};

	this.progress = function( update, strict ) {
		if ( !fulfilled ) {
			signalWaiting( waiting, PROGRESS, update );
			return promise;
		} else if ( strict === true ) {
			throw new Error( FULFILLED_ERROR_MESSAGE );
		} else {
			return promise;
		}
	};

	this.resolve = function( value, strict ) {
		if ( !fulfilled ) {
			signalWaiting( waiting, fulfilled = RESOLVED, result = value );
			waiting = null;
			return promise;
		} else if ( strict === true ) {
			throw new Error( FULFILLED_ERROR_MESSAGE );
		} else {
			return promise;
		}
	};

	var reject = this.reject = function( error, strict ) {
		if ( !fulfilled ) {
			signalWaiting( waiting, fulfilled = REJECTED, result = error );
			waiting = null;
			return promise;
		} else if ( strict === true ) {
			throw new Error( FULFILLED_ERROR_MESSAGE );
		} else {
			return promise;
		}
	};

	this.then = promise.then = function( callback, errback, progback) {
		var listener = [ progback, callback, errback ];

		listener.cancel = promise.cancel;
		listener.deferred = new Deferred(function( reason ) {
			return listener.cancel && listener.cancel( reason );
		});

		if ( fulfilled && !waiting ) {
			signalListener( listener, fulfilled, result );
		} else {
			waiting.push( listener );
		}

		return listener.deferred.promise;
	};

	this.cancel = promise.cancel = function( reason, strict ) {
		if ( !fulfilled ) {
			if ( canceler ) {
				var returnedReason = canceler( reason );
				reason = typeof returnedReason === 'undefined' ? reason : returnedReason;
			}

			canceled = true;
			if ( !fulfilled ) {
				if ( typeof reason === 'undefined' ) {
					reason = new Error( CANCELED_ERROR_MESSAGE );
				}
				reject( reason );
				return reason;
			} else if ( fulfilled === REJECTED && result === reason ) {
				return reason;
			}
		} else if ( strict === true ) {
			throw new Error( FULFILLED_ERROR_MESSAGE );
		}
	};

	freezeObject( promise );
};

Deferred.prototype.toString = function() {
	return '[object Deferred]';
};

Deferred.Promise = Promise;
module.exports = Deferred;