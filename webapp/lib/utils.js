ConvertToTSV = function (data, keys) {

    var array = typeof data != 'object' ? JSON.parse(data) : data;
    var str = '';

    keys.map(function(key) {
        if (str != '') str += '\t'
        str += key;
    })
    str += "\n";

    for (var i = 0; i < array.length; i++) {
        var line = '';

        keys.map(function(key) {
            var obj = array[i];
            if (line != '') line += '\t'
            if (key in obj) {
	        var value = obj[key];
		if (value != null)
		    line += String(value).replace(/[\t\n\r]/g, " ");
            }
        });

        str += line + '\n';
    }

    return str;
}

naturalSort =  function(as, bs) {
    var a, a1, b, b1, rd, rx, rz;
    rx = /(\d+)|(\D+)/g;
    rd = /\d/;
    rz = /^0/;
    if (typeof as === "number" || typeof bs === "number") {
      if (isNaN(as)) {
	return 1;
      }
      if (isNaN(bs)) {
	return -1;
      }
      return as - bs;
    }
    a = String(as).toLowerCase();
    b = String(bs).toLowerCase();
    if (a === b) {
      return 0;
    }
    if (!(rd.test(a) && rd.test(b))) {
      return (a > b ? 1 : -1);
    }
    a = a.match(rx);
    b = b.match(rx);
    while (a.length && b.length) {
      a1 = a.shift();
      b1 = b.shift();
      if (a1 !== b1) {
	if (rd.test(a1) && rd.test(b1)) {
	  return a1.replace(rz, ".0") - b1.replace(rz, ".0");
	} else {
	  return (a1 > b1 ? 1 : -1);
	}
      }
    }
    return a.length - b.length;
};
