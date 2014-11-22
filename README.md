# JST
> light and fast javascript template engine

## Getting Started
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/yessky/JST/master/src/JST.js
[max]: https://raw.github.com/yessky/JST/master/src/JST.js

In your web page:

```html
<script src="src/JST.js"></script>
<script>
var data = {
	name: 'aaron',
	hobbies: ['snooker', 'swimming', 'LOL','dota'];
};
var tpl = 'Folloing list <%=name%>\'s hobbies!<ul>' +
	'<%var i = -1, item;while((item=hobbies[++i])){%>' +
	'<li><%=i%>. <%=item%></li>' +
	'</ul>';
JST.cache( 't-1', tpl );
var templateString = JST( 't-1', data );
</script>
```

## Documentation
_(Coming soon)_

## Examples
_(Coming soon)_

## Release History
_(Nothing yet)_
