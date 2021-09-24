window.AudioContext = window.AudioContext || window.webkitAudioContext;
var frequencies = [];
var audioContext = null;
var isPlaying = false;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
var canvasElem = null;
var mediaStreamSource = null;
var detectorElem, 
	context,
	pitchElem,
	noteElem;
var rafID = null;
var tracks = null;
var buflen = 2048;
var buf = new Float32Array(buflen);

var notes = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
];

var canvasWidth = 800;
var canvasHeight = 600;
var xPoint = 0;
var yPoint = canvasHeight;

window.onload = function() {
	audioContext = new AudioContext();
	detectorElem = document.getElementById( "detector" );
	canvasElem = document.getElementById("canvas");
	if (canvasElem) {
		context = canvasElem.getContext("2d");
		context.strokeStyle = "black";
		context.lineWidth = 1;
	}
	pitchElem = document.getElementById( "pitch" );
	noteElem = document.getElementById( "note" );
}

function startHumming() {
    getUserMedia(
        {
            audio: {
                mandatory: {
                    googEchoCancellation: "false",
                    googAutoGainControl: "false",
                    googNoiseSuppression: "false",
                    googHighpassFilter: "false",
                },
                optional: [],
            },
        },
        gotStream
    );
}

function getUserMedia(dictionary, callback) {
    try {
        navigator.getUserMedia = 
        	navigator.getUserMedia ||
        	navigator.webkitGetUserMedia ||
        	navigator.mozGetUserMedia;
        navigator.getUserMedia(dictionary, callback, error);
    } catch (e) {
        alert('getUserMedia threw exception :' + e);
    }
}

function gotStream(stream) {
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    // Connect it to the destination.
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    mediaStreamSource.connect( analyser );
    drawArt();
}

function drawArt(time) {
    analyser.getFloatTimeDomainData(buf);
    var pitch = getPitch(buf, audioContext.sampleRate);
	var note = getNoteFromPitch(pitch);
	yPoint = getYPointFromNote(note);

	if (xPoint === canvasWidth) {
		xPoint = 0;
	}

	xPoint = xPoint + 10;
	
	console.log(xPoint + ", " + yPoint);

    if (canvasElem) {
		context.strokeStyle = "red";
        context.beginPath();
        context.moveTo(xPoint, yPoint);
        context.lineTo(xPoint, yPoint - 2);
        context.stroke();

		var y2 = yPoint + 400;

		context.strokeStyle = "green";
        context.beginPath();
        context.moveTo(xPoint, y2);
        context.lineTo(xPoint, y2 - 2);
        context.stroke();
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = window.webkitRequestAnimationFrame;
    rafID = window.requestAnimationFrame(drawArt);
}

function getYPointFromNote(note) {
	return note % canvasHeight;
	// if (note === "A") {
    //     return canvasHeight / 1;
    // } else if (note === "A#") {
    //     return canvasHeight / 2;
    // } else if (note === "B") {
    //     return canvasHeight / 3;
    // } else if (note === "C") {
    //     return canvasHeight / 4;
    // } else if (note === "C#") {
    //     return canvasHeight / 5;
    // } else if (note === "D") {
    //     return canvasHeight / 6;
    // } else if (note === "D#") {
    //     return canvasHeight / 7;
    // } else if (note === "E") {
    //     return canvasHeight / 8;
    // } else if (note === "F") {
    //     return canvasHeight / 9;
    // } else if (note === "F#") {
    //     return canvasHeight / 10;
    // } else if (note === "G") {
    //     return canvasHeight / 11;
    // } else if (note === "G#") {
    //     return canvasHeight / 12;
    // }
}

function getNoteFromPitch(frequency) {
	var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
	var noteValue =  Math.round( noteNum ) + 69;
	return noteValue;
	//return notes[noteValue % 12];
}

function getPitch( buf, sampleRate ) {
	// Implements the ACF2+ algorithm
	var SIZE = buf.length;
	var rms = 0;

	for (var i=0;i<SIZE;i++) {
		var val = buf[i];
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE);
	if (rms<0.01) // not enough signal
		return -1;

	var r1=0, r2=SIZE-1, thres=0.2;
	for (var i=0; i<SIZE/2; i++)
		if (Math.abs(buf[i])<thres) { r1=i; break; }
	for (var i=1; i<SIZE/2; i++)
		if (Math.abs(buf[SIZE-i])<thres) { r2=SIZE-i; break; }

	buf = buf.slice(r1,r2);
	SIZE = buf.length;

	var c = new Array(SIZE).fill(0);
	for (var i=0; i<SIZE; i++)
		for (var j=0; j<SIZE-i; j++)
			c[i] = c[i] + buf[j]*buf[j+i];

	var d=0; while (c[d]>c[d+1]) d++;
	var maxval=-1, maxpos=-1;
	for (var i=d; i<SIZE; i++) {
		if (c[i] > maxval) {
			maxval = c[i];
			maxpos = i;
		}
	}
	var T0 = maxpos;

	var x1=c[T0-1], x2=c[T0], x3=c[T0+1];
	a = (x1 + x3 - 2*x2)/2;
	b = (x3 - x1)/2;
	if (a) T0 = T0 - b/(2*a);

	return sampleRate/T0;
}

function error() {
    alert("Stream generation failed.");
}

