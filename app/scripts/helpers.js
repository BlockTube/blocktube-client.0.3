(function(document) {
	'use strict';

	var app = document.querySelector('#app');

	function Helpers() {}

	Helpers.prototype.fixaddress = function(address) {
		function strStartsWith(str, prefix) {
			return str.indexOf(prefix) === 0;
		}
		if (!strStartsWith(address, '0x')) {
			return ('0x' + address);
		}
		return address;
	};

	app.helpers = new Helpers();

})(document);