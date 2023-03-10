(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
})((function () {
    const moveSubtitlesUpBy = {
        "noovo": -5,
        "telequebec": -5,
        "toutv": -4
    };

    /* telequebec does rolling cues, which is very difficult to read. From what I could gather, the cues look like the following:
    cue #1: start-time: t1, end-time: t2
        a
        b
    cue #2: start-time: t3, end-time: t4
        b
        c
    cue #3: start-time: t5, end-time: t6
        c
        d
        e
    cue #4: start-time: t7, end-time: t8
        d
        e
        f
    cue #5: start-time: t9, end-time: t10
        e
        f
        g
    cue #6: start-time: t11, end-time: t12
        f
        g
        h
    However, it's not always a group of 3. So I need to check one by one and decide the text and start times
    */

    function squashCues(cues, cueIdCount) {
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
                    newCue.id = cueIdCount;
                    cueIdCount++;
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
            let newCue = new VTTCue(startTime, cues[cues.length - 1].endTime, rollingLines.join(" "));
            newCue.id = cueIdCount;
            cueIdCount++;
            squashedCues.push(newCue);
        }
        return [squashedCues, cueIdCount]; 
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

    function createWrapper(document) {
        let wrapper = document.getElementById("invisible-translate-wrapper");
        if (!wrapper) {
            wrapper = document.createElement("div");
            wrapper.id = "invisible-translate-wrapper";
            wrapper.style.position = "relative";
            wrapper.style.zIndex = "100";
            wrapper.style.opacity = 0;
        }
        return wrapper;
    }

    function getWrapper(document) {
        return document.getElementById("invisible-translate-wrapper");
    }

    // create all the divs that will be translated by google
    function createTranslateElements(cues, wrapper) {
        for (const cue of cues) {
            if (cue.isElementCreated) {
                continue; 
            }
            let d = document.createElement("span");
            d.classList.add("invisible-translate");
            d.id = "translate" + cue.id;
            d.innerText = cue.text; 
            d.style.opacity = 0;
            d.style.height = 0;
            d.style.width = 0;
            // parent position relative and child position absolute -> take up no space.
            d.style.position = "absolute";  
            d.style.overflow = "hidden";
            d.style.fontSize = 0;
            d.translate = "yes";
            wrapper.appendChild(d);
            cue.isElementCreated = true;
        }
    }


    // split lines
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
                } else {
                    parsed += char;
                    i++;
                }
            }
            parsed = parsed.replace(/\s+/g,' ').trim();
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


    // style the subtitles
    var addRule = (function(style){
        var sheet = document.head.appendChild(style).sheet;
        return function(selector, css){
            var propText = Object.keys(css).map(function(p){
                return p+":"+css[p]
            }).join(";");
            sheet.insertRule(selector + "{" + propText + "}", sheet.cssRules.length);
        }
    })(document.createElement("style"));


    // TODO: change the name of this.
    function addEnglishToOriginalCues(host, cueDict, processedCueIds, video, subtitleMovedUp) {
        let notYetTranslatedCueDict = {};
        for (let cueId in cueDict) {
            let cue = cueDict[cueId];
            if (processedCueIds.includes(cue.id)) continue;
            cue.bilingualLines = [];
            cue.frenchLines = [];
            cue.englishLines = [];
            const div = document.getElementById("translate" + cue.id);
            if (div) {
                const frenchLine = cue.text.trim();
                const englishLine = div.innerText.trim();
                cue.frenchLines.push(frenchLine);
                cue.englishLines.push(englishLine);
                if (frenchLine === englishLine) {
                    // if the french didnt get translated yet, dont show double french
                    cue.bilingualLines.push(frenchLine);
                    console.log("Google translation in progress.");
                    notYetTranslatedCueDict[cue.id] = cue;
                } else {
                    let bilingualLine = frenchLine + "\n" + englishLine;
                    // french
                    cue.bilingualLines.push(bilingualLine);
                    processedCueIds.push(cue.id);
                }
                // cue.text = cue.bilingualLines.join("\n");
            } else {
                console.log("div cant be found");
            }
        }

        function appendCues(track, type, host, subtitleMovedUp) {
            for (const cueId in cueDict) {
                let cue = cueDict[cueId];
                var theCue = track.cues.getCueById(cueId);
                if (!theCue) {
                    // make new cue
                    theCue = new VTTCue(cue.startTime, cue.endTime, "");
                    theCue.align = "center";
                    theCue.position = "auto";
                    if (subtitleMovedUp) {
                        theCue.line = moveSubtitlesUpBy[host];
                    } else {
                        theCue.line = "auto";
                    }
                    theCue.id = cue.id;
                }

                if (type === "dual-mode") {
                    theCue.text = cue.bilingualLines.join("\n");
                } else if (type === "english-mode") {
                    theCue.text = cue.englishLines.join("\n");
                } else if (type === "french-mode") {
                    theCue.text = cue.frenchLines.join("\n");
                }
                track.addCue(theCue);
            }
        }

        function createTrack(video, type, host, subtitleMovedUp) {
            track = video.addTextTrack("captions", type);
            // bilingualTrack.id = "bilingual-track";   // the id is a readonly attribute
            appendCues(track, type, host, subtitleMovedUp);
            return track;
        }
        if ((host === "telequebec" && video.textTracks.length == 2) || 
            ((host === "noovo" || host === "toutv") && video.textTracks.length == 0)) {
            for (const mode of ["dual-mode", "english-mode", "french-mode"]) {
                let track = createTrack(video, mode, host);
                video.append(track);
            }
        } else {
            let bilingualTrack = video.textTracks[video.textTracks.length - 3];
            appendCues(bilingualTrack, "dual-mode", host, subtitleMovedUp);
            let englishTrack = video.textTracks[video.textTracks.length - 2];
            appendCues(englishTrack, "english-mode", host, subtitleMovedUp);
            let frenchTrack = video.textTracks[video.textTracks.length - 1];
            appendCues(frenchTrack, "french-mode", host, subtitleMovedUp);
        }


        cueDict = notYetTranslatedCueDict;

        return [cueDict, processedCueIds];
    }

    function toggleTextTracksTelequebec(mode, video) {
        let index = 0;
        modeIndexDict = {}; // key - mode; value - index
        while (index < video.textTracks.length) {
            const textTrack = video.textTracks[index];
            if (textTrack.label === "fran??ais") {
                modeIndexDict["off"] = index;
            }
            if (textTrack.label === "dual-mode") {
                modeIndexDict["dual-mode"] = index;
            }
            if (textTrack.label === "english-mode") {
                modeIndexDict["english-mode"] = index;
            }
            if (textTrack.label === "french-mode") {
                modeIndexDict["french-mode"] = index;
            }
            index ++;
        }
        if (!video.textTracks[modeIndexDict["off"]] || !video.textTracks[modeIndexDict["dual-mode"]] || 
            !video.textTracks[modeIndexDict["english-mode"]] || !video.textTracks[modeIndexDict["french-mode"]]) return;

        function showTargetTextTrackAndHideOthers(targetIndex) {
            let index = 0;
            while (index < video.textTracks.length) {
                if (index === targetIndex) {
                    video.textTracks[index].mode = "showing";
                } else {
                    video.textTracks[index].mode = "hidden";
                }
                index++;
            }
        }

        showTargetTextTrackAndHideOthers(modeIndexDict[mode]);
    }

    async function getSavedMode() {
        var mode = (await chrome.storage.local.get(["mode"]))["mode"];
        if (!mode) mode = "dual-mode";
        return mode;
    }

    function changeSubtitleFontSize() {
        let newFontSize = document.getElementsByTagName("VIDEO")[0].parentElement.offsetHeight * 0.035;
        addRule("video::cue", { "font-size": `${newFontSize}px`});
    }

    function styleVideoCues() {
        addRule("video::cue", {
            /* this background setting works for PCs, but not apple products. 
            For apple products, this setting is actually in settings->accessibility->captions
            */
            background: "transparent", 
            color: "white",
            "font-weight": "bold"
        });
    }

    // spaceFrom Bottom determines how far the subtitles are from the bottom of the video
    function adjustSubtitlePosition(spaceFromBottom) {
        let textTracks = document.getElementsByTagName("VIDEO")[0].textTracks;
        for (let textTrackIndex of [...Array(textTracks.length).keys()]) {
            for (let cueIndex in textTracks[textTrackIndex].cues) {
                textTracks[textTrackIndex].cues[cueIndex].line = spaceFromBottom;
            }
        }
    }

    // telequebec uses brightcove to manage their videos, so first I need to find the vtt files from the networks requests/responses.

    // cueDict is a dictionary of cues to be processed (just downloaded).
    var cueDict = {};  // it's a global variable because there doesnt seem to be ways to pass extra params into the mutation observer.
    var processedCueIds = [];
    var mode;
    var cueIdCount = 0;
    var fetchedUrls = new Set();
    var subtitleMovedUp = null;

    var prepareContainer = function(mutations, observer){
        for (const mutation of mutations){
            if (mutation.target.tagName === "VIDEO") {
                let track =  document.getElementById("fran??ais");
                if (track && mode !== 'off') {
                    track.track.mode = "hidden";
                }
                let timeDisplay =  document.getElementsByClassName("vjs-current-time vjs-time-control vjs-control")[0];
                if (timeDisplay) {
                    timeDisplay.translate = "no";
                    timeDisplay.setAttribute("translate", "no");
                }
                var resizeObserver = new ResizeObserver(changeSubtitleFontSize);
                resizeObserver.observe(document.getElementsByTagName("VIDEO")[0]);

                subtitlePositionObserver = new MutationObserver(adjustSubtitlePositionWrapper);
                subtitlePositionObserver.observe(document.getElementsByClassName("beacon-js video-js-custom")[0], 
                                                  {attributes: true, attributeFilter: ["class"]});
            }
        }
    };
    videoReadyObserver = new MutationObserver(prepareContainer);
    videoReadyObserver.observe(document.documentElement, {characterData: true, childList:true, subtree:true});


    let wrapper = createWrapper(document);
    document.body.appendChild(wrapper);
    translationObserver = new MutationObserver(addEnglishToOriginalCuesWrapper);
    translationObserver.observe(wrapper, {characterData: true, subtree: true});

    chrome.runtime.onMessage.addListener(async function (response, sendResponse) {
        if (response["type"] === "mode") {
            mode = response["mode"];
            toggleTextTracksTelequebec(mode, document.getElementById("player_html5_api"));
        } else if (response["type"] === "subtitles") {
            const url = response["url"];
            if (fetchedUrls.has(url)) {
                return true;
            }
            fetchedUrls.add(url);
            const vtt = response["original_vtt"]; 
            let frenchCues = await parseVttCues(vtt);
            [frenchCues, cueIdCount] = squashCues(frenchCues, cueIdCount);
            for (const cue of frenchCues) {
                if (processedCueIds.includes(cue.id)) continue;
                if (!cueDict.hasOwnProperty(cue.id)) {
                    cue.isElementCreated = false;
                    cueDict[cue.id] = cue;
                }
            }
            createTranslateElements(frenchCues, getWrapper(document));
        }
        return true;
    });


    async function addEnglishToOriginalCuesWrapper(mutations, observer) {
        const video = document.getElementById("player_html5_api");
        [cueDict, processedCueIds] = addEnglishToOriginalCues("telequebec", cueDict, processedCueIds, video, subtitleMovedUp);
        mode = await getSavedMode();
        toggleTextTracksTelequebec(mode, video);
    }

    styleVideoCues();

    function adjustSubtitlePositionWrapper(mutations, observer) {
        const mutation = mutations[mutations.length - 1];
        if (mutation.target.className.includes("vjs-user-active") && (subtitleMovedUp === null || !subtitleMovedUp)) {
            subtitleMovedUp = true;
            adjustSubtitlePosition(moveSubtitlesUpBy["telequebec"]);

        } else if (mutation.target.className.includes("vjs-user-inactive") && (subtitleMovedUp === null || subtitleMovedUp)) {
            subtitleMovedUp = false;
            adjustSubtitlePosition("auto");
        }
    }

}));
