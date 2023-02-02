async function doit() {

    // let vtt = await fetch("https://pe-fa-vp01a.9c9media.com/playlist/4427628/133995772/vtt/00000000/086e5356a774354d/manifest.vtt")
    let vtt = await fetch("https://rcavstaticstreaming.akamaized.net/stc/c78debe5-c668-46c7-9aeb-cd8b20fd5f88/src_acoeurbattant_s01e01.vtt");
    vtt = await vtt.text();
    console.log(vtt)
    let cues = await parseVttCues(vtt);
    console.log(cues);
    // cues = squashCuesNoovo(cues);
}

doit();
async function parseVttCues(vtt){
    const url = getVTTURL(vtt);

    // const video = document.getElementById("player_html5_api");
    const video = document.createElement("video");
    const track = document.createElement("track");
    const cues = await vttToCues(video, track, url);
    for (let cue of cues) {
        const lines = cue.text.split("\n");
        let parsedLines = parseLines(lines);
        cue.parsedLines = parsedLines;
        cue.parsedLine = parsedLines.join(" ");
    }
    return cues;
}

function parseLines(lines) {
    let parsedLines = [];
    for (let line of lines) {
        let i = 0;
        let parsed = "";
        while (i < line.length) {
            let char = line[i];
            if (char === "<") {
                const frontTagPattern = /<\w>/; // like <b>
                const backTagPattern = /<\/\w>/; // like </b>
                if (frontTagPattern.test(line.slice(i, i+3))) {
                    i += 3;
                } else if (backTagPattern.test(line.slice(i, i+4))) {
                    i += 4;
                } else {
                    i++;
                }
            } else{
                parsed += char;
                i++;
            }
        }
        parsed = parsed.replace(/\s+/g,' ').trim()
        parsedLines.push(parsed);
    }
    return parsedLines;
}

const vttToCues = (video, track, url) => {
    // we need a <video> element, but it can stay disconnected
    // it also doesn't need to point to an actual media
    track.default = true;
    video.append(track);
    return new Promise((res, rej) => {
      track.onload = (evt) => res([...video.textTracks[0].cues]);
      track.onerror = (evt) => rej("invalid url");
      track.src = url;
    });
  };
  
  
function getVTTURL(vttText) {
    const vttBlob = new Blob([vttText], {
        type: 'text/plain'
    });
    return URL.createObjectURL(vttBlob);
}


function squashCues(cues) {
    let squashedCues = [];
    let startTime;
    let rollingLines = [];
    let displayed = [];
    for (let [index, cue] of cues.entries()) {
        if (rollingLines.length === 0) {
            startTime = cue.startTime;
            for (const cueLine of cue.parsedLines) {
                if (!displayed.includes(cueLine)) {
                    rollingLines.push(cueLine);
                }
            }
        } else {
            let appendableLines = [];
            for (const line of cue.parsedLines) {
                if (!displayed.includes(line)) {
                    appendableLines.push(line);
                }
            }
            let unionedLines = arrayUnion(rollingLines, appendableLines, areEqual);
            if (unionedLines.length >= 3) {
                if (!startTime) {
                    startTime = cue.startTime;
                }
                let newCue = new VTTCue(startTime, cue.endTime, unionedLines.join(" "));
                newCue.id = cue.id;
                squashedCues.push(newCue);
                startTime = null;
                rollingLines = [];
                displayed = unionedLines;
                unionedLines = [];
            } else {
                rollingLines = unionedLines;
            }
        }
    }
    if (rollingLines.length > 0) {
        // if (!startTime) {
        //     startTime = cues[cues.length - 1].startTime;
        // }
        let newCue = new VTTCue(startTime, cues[cues.length - 1].endTime, rollingLines.join(" "));
        newCue.id = cues[cues.length - 1].id;
        squashedCues.push(newCue);
    }
    return squashedCues; // this startTime is for the next batch
}


function squashCuesNoovo(cues) {
    let squashedCues = [];
    let startTime;
    let rollingLine = "";
    let displayed = "";
    let cueIdCount = 0;
    for (let [index, cue] of cues.entries()) {
        if (index === 0) {
            startTime = cue.startTime;
            rollingLine = cue.parsedLine;
            continue
        }
        if (rollingLine.length === 0) {
            startTime = cue.startTime;
            rollingLine = cue.parsedLine;
        } else {

            let unionedLine = stringUnion(rollingLine, cue.parsedLine);
            [_, unionedLine] = getNewlyRolledInAndOutText(displayed, unionedLine);

            if (unionedLine.length >= 70) {
                if (!startTime) {
                    startTime = cue.startTime;
                }
                let newCueLine = unionedLine;
                let rollingLine = "";
                if (![" ", "!", ".", "?"].includes(unionedLine[unionedLine.length - 1])) {
                    newCueLine = unionedLine.slice(0, unionedLine.lastIndexOf(" "));  // make sure we dont cut words
                    rollingLine = unionedLine.slice(unionedLine.lastIndexOf(" "));
                }
                let newCue = new VTTCue(startTime, cue.endTime, newCueLine);
                newCue.id = cueIdCount;
                cueIdCount++;
                squashedCues.push(newCue);
                startTime = cue.endTime;
                displayed = newCueLine;
            } else {
                rollingLine = unionedLine;
            }
        }
    }
    if (rollingLine.length > 0) {
        let newCue = new VTTCue(startTime, cues[cues.length - 1].endTime, rollingLine);
        newCue.id = cueIdCount;
        squashedCues.push(newCue);
    }
    return squashedCues;
}

// combine "abc", "bcd" to be "abcd"
// combine "b", "abc" to be "abc"
function stringUnion(oldText, newText) {
    if (newText.includes(oldText)) return newText;
    let i = 0;
    while (i < oldText.length) {
        oldChar = oldText[i];
        if (oldChar === newText[0]) {
            if (oldText.slice(i) === newText.slice(0, oldText.length - i)) {
                return oldText + newText.slice(oldText.length - i);
            } else {
                i++;
            }
        } else {
            i++;
        }
    }
    return oldText + newText;
}


/*
example inputs:
    oldText = "comment j'ai hâte de ça. Que commence... (Mégaphone)"
    newText = "Que commence... (Mégaphone) L'ultime"
returns: 
    "comment j'ai hâte de ça. ", "L'ultime" 

example 2: abc, zzzabcyyy => yyy
*/
function getNewlyRolledInAndOutText(oldText, newText) {
    if (newText.includes(oldText)) {
        return ["", newText.slice(newText.indexOf(oldText) + oldText.length)];
    }
    let i = 0;
    while (i < oldText.length) {
        oldChar = oldText[i];
        if (oldChar === newText[0]) {
            if (oldText.slice(i) === newText.slice(0, oldText.length - i)) {
                return [oldText.slice(0, i), newText.slice(oldText.length - i)];
            } else {
                i++;
            }
        } else {
            i++;
        }
    }
    return [oldText, newText];
}


function arrayUnion(arr1, arr2, equalityFunc) {
    var union = arr1.concat(arr2);

    for (var i = 0; i < union.length; i++) {
        for (var j = i+1; j < union.length; j++) {
            if (equalityFunc(union[i], union[j])) {
                union.splice(j, 1);
                j--;
            }
        }
    }

    return union;
}

function areEqual(item1, item2) {
    return item1 === item2;
}
