var events = require('events');
var SerialPort = require("serialport").SerialPort

//
// Class MilightRF24Controller
//

/**
 *
 * @param options
 * @constructor
 */
var MilightRF24Controller = function (options) {
    var self = this;
	options = options || {};
	
	this._counter = 0;
	this._lastSend = 0;
	this._packets = new Array();
	this._sending = false;
	
	this._serialPort = new SerialPort(options.port, {
	  baudrate: 115200
	});
	
	this._emitter = new events.EventEmitter();
	
	this._emitter.on("sendData", function () {
		if(self._packets.length > 0){
			var packet = self._packets.shift();
			console.log(packet);
			self._serialPort.write(packet+"\r\n", function(err, results){
				
				setTimeout(function(){
					self._emitter.emit("sendData");
				}, 200);
			});
		}
		else
			_sending = false;
	});

	this._emitter.on("dataReceived", function (data){
		data = String(data).split(" ");
		console.log("data:"+data);
		var cmd = "ID:"+data[1]+data[2]+";";
		var group = parseInt(data[4],16).toString(10) & 0x07;
		
		if(group) 
		  cmd += "Group:"+group+";";
		else
		  cmd += "All;";
		
		var button = parseInt(data[5], 16).toString(10) & 0x0F;
		var brightnes = null;
		var color = null;
		var disco = null;
		
		if(button == 0x0F) {
		  console.log("Color:"+data[3]);
		  color = data[3];
		}
		else if(button == 0x0E) {
		  brightnes = (parseInt(data[4], 16).toString(10) & 0xF8) >> 3;
		  
		  if(brightnes <= 18) {
			brightnes -= 16;
			brightnes = brightnes * -1;
		  }
		  else{
			brightnes -= 47;
			brightnes = brightnes * -1;
		  }
		  
		  if(brightnes < 0)
			brightnes = 0;
		  else if(brightnes > 25)
			brightnes = 25;
		
		  if(brightnes <= 16) {
			brightnes = brightnes * -1;
			brightnes += 16;
		}
		else {
			brightnes = brightnes * -1;
			brightnes += 47;
		}
		
		brightnes = brightnes << 3;
		
		brightnes = numHex(brightnes);
		console.log(brightnes);
		  
		  console.log("Brightnes"+ brightnes);
		}
		else if(button == 0x0D) {
		  disco = parseInt(data[0],16).toString(10) & 0x0F;
		  console.log("Disco "+disco);
		}
		else if(button == 0x0C) 
		  console.log("Speed -;");
		else if(button == 0x0B) 
		  console.log("Speed +;");
		else if(button == 0x0A) 
		  console.log("Group 4 off;");
		else if(button == 0x09) 
		  console.log("Group 4 on;");
		else if(button == 0x08) 
		  console.log("Group 3 off;");
		else if(button == 0x07) 
		  console.log("Group 3 on;");
		else if(button == 0x06) 
		  console.log("Group 2 off;");
		else if(button == 0x05) 
		  console.log("Group 2 on;");
		else if(button == 0x04)
		  console.log("Group 1 off;");
		else if(button == 0x03)
		  console.log("Group 1 on;");
		else if(button == 0x02)
		  console.log("All off;");
		else if(button == 0x01)
		  console.log("All on;");
		else if(button == 0x00) 
		  console.log("Slider released;");
		  
		if(parseInt(data[5],16).toString(10) & 0x10)
		  console.log("Long press;");
		else
		  console.log("Short press;");
		
		console.log(cmd);
	});

};


MilightRF24Controller.prototype.open = function () {
	var self = this;
	
	self._serialPort.on("open", function () {
		self._serialPort.on('data', function(data) {
			if(data.length == 22) {
				self._emitter.emit("dataReceived", data);
			}
		});

		setTimeout(function() {
			self._serialPort.write("x", function(err, results) {
				self._serialPort.write("r\r\n");
			});
		}, 5000);
	});
}

MilightRF24Controller.prototype.setColor = function (id,zone,r,g,b){
	var self = this;
	
	self._queueData(id, zone, 0, self._numHex(self._hsvToMilightColor(self._rbgToHsv(r,b,g))), "00", "0F", 2);
	self._queueData(id, zone, 0, self._numHex(self._hsvToMilightColor(self._rbgToHsv(r,b,g))), "00", "00", 30);
}

MilightRF24Controller.prototype.setBrightnes =  function (id, zone, percent) {
	var self = this;
	
	var brightnes = Math.max( 0,(Math.ceil(percent/100*25)) - 1);
	
	if(brightnes <= 16) {
        brightnes = brightnes * -1;
		brightnes += 16;
	}
	else {
        brightnes = brightnes * -1;
		brightnes += 47;
	}
	
	brightnes = brightnes << 3;

	self._queueData(id, zone, 0, "00", brightnes, "0E", 2);
	self._queueData(id, zone, 0, "00", brightnes, "00", 30);
}

MilightRF24Controller.prototype.sendButton =  function (id, zone, button) {
	var self = this;
	
	self._queueData(id, zone, 0, "00", "00", button, 30);
}

MilightRF24Controller.prototype.sendDiscomode = function (id, zone, discomode) {
	var self = this;
	
	if(discomode < 0 || discomode > 8)
		return;
	
	self._queueData(id, zone, 0, "00", "00", 0x0D, 30);
}


MilightRF24Controller.prototype._queueData = function(id, zone, disco, color, brightnes, button, repeats) {
	var self = this;
	
	if(self._counter > 255)
		_counter = 0;
	
	if(zone > 4)
		return;
	
	self._counter++;
	
	brightnes = self._numHex(brightnes | zone);
	
	var strRepeats = "";
	for(var i = 0; i < repeats; i++)
		strRepeats += ".";
	
	var packet = "B"+disco+id+color+self._numHex(brightnes)+self._numHex(button)+self._numHex(self._counter)+strRepeats;
	
	self._packets.push(packet);
	
	if(self._sending === false) {
		self._sending = true;
		self._emitter.emit("sendData");
	}
}

MilightRF24Controller.prototype._numHex = function (s) {
  var a = s.toString(16);
  if( (a.length % 2) > 0 ){ a = "0" + a; }
  return a;
}

/** Converts a RGB color value to HSV
 * @see http://en.wikipedia.org/wiki/HSL_and_HSV and http://www.rapidtables.com/convert/color/rgb-to-hsv.htm
 * @param r
 * @param g
 * @param b
 * @returns {*{}}
 */
MilightRF24Controller.prototype._rbgToHsv = function (r, g, b) {
    r = r / 255, g = g / 255, b = b / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if (max == min) {
        h = 0;
    }
    else {
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0));
                break;
            case g:
                h = ((b - r) / d + 2);
                break;
            case b:
                h = ((r - g) / d + 4);
                break;
        }
        h = Math.round(h * 60);
        s = Math.round(s * 100);
        v = Math.round(v * 100);
    }
    //console.log([h,s,v ]);
    return [h, s, v];
};

MilightRF24Controller.prototype._hsvToMilightColor = function (hsv){
    // On the HSV color circle (0..360) with red at 0 degree. We need to convert to the Milight color circle
    // which has 256 values with red at position 176
    var color = (256 + 26 - Math.floor(Number(hsv[0]) / 360.0 * 255.0)) % 256;
    return color;
};

var RGBWButtons = function(){};
RGBWButtons.prototype.AllOn = 0x01;
RGBWButtons.prototype.AllOff = 0x02;
RGBWButtons.prototype.Group1On = 0x03;
RGBWButtons.prototype.Group1Off = 0x04;
RGBWButtons.prototype.Group2On = 0x05;
RGBWButtons.prototype.Group2Off =0x06;
RGBWButtons.prototype.Group3On = 0x07;
RGBWButtons.prototype.Group3Off = 0x08;
RGBWButtons.prototype.Group4On = 0x09;
RGBWButtons.prototype.Group4Off = 0x0A;
RGBWButtons.prototype.SpeedUp = 0x0B;
RGBWButtons.prototype.SpeedDown = 0x0C;

module.exports = {
	MilightRF24Controller: MilightRF24Controller,
	RGBWButtons: new RGBWButtons()
}