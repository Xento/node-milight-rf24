var Milight = require('./index').MilightRF24Controller;
var Buttons = require('./index').RGBWButtons;

var light = new Milight({
        port: "/dev/ttyUSB1"
    });
	
light.open();

setTimeout(function(){
	light.sendButton("5927", 0, Buttons.AllOn);
	light.setColor("5927", 0, 255,255,0);
}, 6000);