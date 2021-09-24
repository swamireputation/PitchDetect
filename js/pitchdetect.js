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
	canvas,
	pitchElem,
	noteElem;
var rafID = null;
var tracks = null;
var buflen = 2048;
var buf = new Float32Array(buflen);

var noteStrings = [
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

window.onload = function() {
	audioContext = new AudioContext();
	detectorElem = document.getElementById( "detector" );
	canvasElem = document.getElementById("canvas");
	if (canvasElem) {
		canvas = canvasElem.getContext("2d");
		canvas.strokeStyle = "black";
		canvas.lineWidth = 1;
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
    updatePitch();
}

function updatePitch(time) {
    var cycles = new Array();
    analyser.getFloatTimeDomainData(buf);
    var pitch = autoCorrelate(buf, audioContext.sampleRate);

    if (canvasElem) {
        // This draws the current waveform, useful for debugging
        canvas.clearRect(0, 0, 512, 256);
        canvas.strokeStyle = "red";
        canvas.beginPath();
        canvas.moveTo(0, 0);
        canvas.lineTo(0, 256);
        canvas.moveTo(128, 0);
        canvas.lineTo(128, 256);
        canvas.moveTo(256, 0);
        canvas.lineTo(256, 256);
        canvas.moveTo(384, 0);
        canvas.lineTo(384, 256);
        canvas.moveTo(512, 0);
        canvas.lineTo(512, 256);
        canvas.stroke();
        canvas.strokeStyle = "black";
        canvas.beginPath();
        canvas.moveTo(0, buf[0]);
        for (var i = 1; i < 512; i++) {
            canvas.lineTo(i, 128 + buf[i] * 128);
        }
        canvas.stroke();
    }

    if (pitch != -1) {
        pitchElem.innerText = Math.round(pitch);
        var note = noteFromPitch(pitch);
        noteElem.innerHTML = noteStrings[note % 12];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = window.webkitRequestAnimationFrame;
    rafID = window.requestAnimationFrame(updatePitch);
}

function noteFromPitch(frequency) {
	var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
	return Math.round( noteNum ) + 69;
}

function autoCorrelate( buf, sampleRate ) {
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

