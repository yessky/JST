function isQuote() {
	return peek === '"' || peek === '\'';
}

function isWord() {
	return /[a-zA-Z_$]/.test( peek );
}