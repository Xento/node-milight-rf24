var events = require('events');
var emitter = new events.EventEmitter();

var SerialPort = require("serialport").SerialPort

var serialPort = new SerialPort("/dev/ttyUSB1", {
  baudrate: 115200
});

serialPort.on("open", function () {
  console.log('open');
  serialPort.on('data', function(data) {
	console.log("Data:"+data);
    if(data.length == 22) {
		console.log(data.length);
		emitter.emit("dataReceived", data);
	}
  });
  
  setTimeout(function() {
	  serialPort.write("x", function(err, results) {
		serialPort.write("r\r\n", function(err, results) {
			//setColor("5927", 0, 0,255,255);
			
			setTimeout(function() {
				//setColor("5927", 0, 0,0,255);
				sendButton("5927", 0, 0x01);
			}, 300);
			
			//setBrightnes("5927", 0, 10);
		  });
	  });
  }, 5000)
});

function setColor(id,zone,r,g,b){
	queueData(id, zone, "00", numHex(hsvToMilightColor(rbgToHsv(r,b,g))), "00", "0F", 0);
	queueData(id, zone, "00", numHex(hsvToMilightColor(rbgToHsv(r,b,g))), "00", "0F", 0);
	queueData(id, zone, "00", numHex(hsvToMilightColor(rbgToHsv(r,b,g))), "00", "0F", 0);
	queueData(id, zone, "00", numHex(hsvToMilightColor(rbgToHsv(r,b,g))), "00", "0F", 0);
	queueData(id, zone, "00", numHex(hsvToMilightColor(rbgToHsv(r,b,g))), "00", "0F", 0);
	queueData(id, zone, "00", numHex(hsvToMilightColor(rbgToHsv(r,b,g))), "00", "00", 30);
	queueData(id, zone, "00", numHex(hsvToMilightColor(rbgToHsv(r,b,g))), "00", "00", 30);
}

function setBrightnes(id, zone, percent) {
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

	queueData(id, zone, "00", "00", brightnes, "0E", 5);
	queueData(id, zone, "00", "00", brightnes, "0E", 5);
	queueData(id, zone, "00", "00", brightnes, "0E", 5);
	queueData(id, zone, "00", "00", brightnes, "0E", 5);
	queueData(id, zone, "00", "00", brightnes, "00", 30);
}

function sendButton(id, zone, button) {
	
	queueData(id, zone, "00", "00", "00", button, 3);
	queueData(id, zone, "00", "00", "00", button, 3);
	queueData(id, zone, "00", "00", "00", button, 3);
	queueData(id, zone, "00", "00", "00", button, 3);
	queueData(id, zone, "00", "00", "00", button, 3);
	queueData(id, zone, "00", "00", "00", button, 3);
	queueData(id, zone, "00", "00", "00", button, 3);
	queueData(id, zone, "00", "00", "00", button, 3);
}

var counter = 0;
var lastSend = 0;
var packets = Array();
var sending = false;
function queueData(id, zone, disco, color, brightnes, button, repeats) {
	if(counter > 255)
		counter = 0;
	
	if(zone > 4)
		return;
	
	counter++;
	
	brightnes = numHex(brightnes | zone);
	
	var strRepeats = "";
	for(var i = 0; i < repeats; i++);
		strRepeats += ".";
	
	var packet = "B0"+id+color+numHex(zone)+numHex(button)+numHex(counter)+strRepeats;
	
	packets.push(packet);
	
	if(sending === false) {
		sending = true;
		emitter.emit("sendData");
	}
}

emitter.on("sendData", function () {
	//var now = new Date().getTime() / 1000;
	
	//if(now - lastSend > 300) {
		
		if(packets.length > 0){
			var packet = packets.shift();
			console.log(packet);
			serialPort.write(packet+"\r\n", function(err, results){
				//lastSend = new Date().getTime() / 1000;
				
				setTimeout(function(){
					emitter.emit("sendData");
				}, 200);
			});
		}
		else
			sending = false;
	/*}
	else {
		setTimeout(sendData(), now - lastSend);
	}*/
});

emitter.on("dataReceived", function (data){
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

function numHex(s) {
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
function rbgToHsv(r, g, b) {
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

function hsvToMilightColor(hsv){
    // On the HSV color circle (0..360) with red at 0 degree. We need to convert to the Milight color circle
    // which has 256 values with red at position 176
    var color = (256 + 26 - Math.floor(Number(hsv[0]) / 360.0 * 255.0)) % 256;
    return color;
};
