(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
})((function () {
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
                  if (![" ", "!", ".", "?"].includes(unionedLine[unionedLine.length - 1])) {
                      newCueLine = unionedLine.slice(0, unionedLine.lastIndexOf(" "));  // make sure we dont cut words
                      unionedLine.slice(unionedLine.lastIndexOf(" "));
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
          cueIdCount++;
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

  function createWrapper(document) {
      let wrapper = document.getElementById("invisible-translate-wrapper");
      if (!wrapper) {
          wrapper = document.createElement("div");
          wrapper.id = "invisible-translate-wrapper";
          wrapper.style.position = "relative";
          wrapper.style.zIndex = "100";
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
          d.style.overflow = "hidden";
          d.style.fontSize = 0;
          d.translate = "yes";  // check if telequebec still works
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
  function addEnglishToOriginalCues(host, cueDict, processedCueIds, video) {
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
                  console.log("The text hasnt been translated yet");
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

      function appendCues(track, type) {
          for (const cueId in cueDict) {
              let cue = cueDict[cueId];
              var theCue = track.cues.getCueById(cueId);
              if (!theCue) {
                  // make new cue
                  theCue = new VTTCue(cue.startTime, cue.endTime, "");
                  theCue.align = "center";
                  theCue.position = "auto";
                  theCue.line = "auto";
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

      function createTrack(video, type) {
          track = video.addTextTrack("captions", type);
          // bilingualTrack.id = "bilingual-track";   // the id is a readonly attribute
          appendCues(track, type);
          return track;
      }
      if ((host === "telequebec" && video.textTracks.length == 2) || 
          ((host === "noovo" || host === "toutv") && video.textTracks.length == 0)) {
          for (const mode of ["dual-mode", "english-mode", "french-mode"]) {
              let track = createTrack(video, mode);
              video.append(track);
          }
      } else {
          let bilingualTrack = video.textTracks[video.textTracks.length - 3];
          appendCues(bilingualTrack, "dual-mode");
          let englishTrack = video.textTracks[video.textTracks.length - 2];
          appendCues(englishTrack, "english-mode");
          let frenchTrack = video.textTracks[video.textTracks.length - 1];
          appendCues(frenchTrack, "french-mode");
      }


      cueDict = notYetTranslatedCueDict;

      return [cueDict, processedCueIds];
  }

  function toggleTextTracksNoovoAndToutv(mode, video, originalSubtitles) {
      let index = 0;
      modeIndexDict = {}; // key - mode; value - index
      while (index < video.textTracks.length) {
          const textTrack = video.textTracks[index];
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
      if (!video.textTracks[modeIndexDict["dual-mode"]] || !video.textTracks[modeIndexDict["english-mode"]] || 
          !video.textTracks[modeIndexDict["french-mode"]]) return;

      function showTargetTextTrackAndHideOthers(mode) {
          if (mode === "off") {
              if (originalSubtitles) {
                  originalSubtitles.style.display = 'block';
              } 
              let index = 0;
              while (index < video.textTracks.length) {
                  video.textTracks[index].mode = "hidden";
                  index++;
              }
              return;
          }

          if (originalSubtitles) {
              originalSubtitles.style.display = 'none'; // this comes up at every mutation tho
          } 
          let targetIndex = modeIndexDict[mode];
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

      showTargetTextTrackAndHideOthers(mode);
  }

  async function getSavedMode() {
      (await chrome.storage.local.get(["mode"]))["mode"];
  }

  /* The subtitles of Noovo are also cable TV styled. A few words get rolled in and out each time. 
  */

  var cueDict = {};  // it's a global variable because there doesnt seem to be ways to pass extra params into the mutation observer.
  var processedCueIds = [];
  var wrapper = createWrapper(document);
  var modified = false;

  var vttReceived = false;
  var mode = getSavedMode();

  var prepareContainer = function(mutations, observer){
      for (const mutation of mutations){
          if (mutation.target.className && 
              typeof mutation.target.className === "string" && 
              mutation.target.className.includes("jw-captions")) {
              if (!modified) {
                  modifyVideoPlayer();
                  modified = true;
              }
              if (mode !== "off") {
                  originalSubtitles = document.getElementsByClassName("jw-text-track-container jw-reset")[0];
                  if (originalSubtitles) {
                      originalSubtitles.style.display = 'none';
                  } 
              }
              // this.disconnect();
          }
      }
  };
  window.initial_observer = new MutationObserver(prepareContainer);
  window.initial_observer.observe(document.documentElement, {childList:true, subtree:true});

  window.observer = new MutationObserver(addEnglishToOriginalCuesWrapper);
  window.observer.observe(wrapper, {characterData: true, subtree: true});

  chrome.runtime.onMessage.addListener(async function (response, sendResponse) {
      if (response["type"] === "mode") {
          mode = response["mode"];
          originalSubtitles = document.getElementsByClassName("jw-text-track-container jw-reset")[0];
          toggleTextTracksNoovoAndToutv(mode, document.getElementsByTagName("VIDEO")[0], originalSubtitles);
      } else if (response["type"] === "subtitles") {
          // Noovo tends to send two duplicates at the beginning of the video.
          if (vttReceived) return true;
          const vtt = response["original_vtt"];
          vttReceived = true;
          console.log(vtt);
          let cues = await parseVttCues(vtt);
          cues = squashCuesNoovo(cues);
          console.log(cues);
          for (const cue of cues) {
              if (processedCueIds.includes(cue.id)) continue;
              if (!cueDict.hasOwnProperty(cue.id)) {
                  cue.isElementCreated = false;
                  cue.align = "center";
                  cue.position = "auto";
                  cue.line = "auto";
                  cueDict[cue.id] = cue;
              }
          }

          createTranslateElements(cues, wrapper);
          if (!getWrapper(document)) {
              const videoWrapper = document.getElementById("vidi_player_instance_1");
              videoWrapper.appendChild(wrapper);
          }
      }
      return true;
  });


  function addEnglishToOriginalCuesWrapper(mutations, observer) {
      const video = document.getElementsByClassName("jw-video jw-reset")[0];
      [cueDict, processedCueIds] = addEnglishToOriginalCues("noovo", cueDict, processedCueIds, video);
      originalSubtitles = document.getElementsByClassName("jw-text-track-container jw-reset")[0];
      toggleTextTracksNoovoAndToutv(mode, document.getElementsByTagName("VIDEO")[0], originalSubtitles);
  }

  addRule("video::cue", {
      /* this background setting works for PCs, but not apple products. 
      For apple products, this setting is actually in settings->accessibility->captions
      */
      background: "transparent", 
      color: "white",
      "font-size": "18px",
  });

  function modifyVideoPlayer() {
      // make the video right-clickable
      var elements = document.getElementsByTagName("*");
      for(var id = 0; id < elements.length; ++id) { 
          elements[id].addEventListener('contextmenu', function(e) {e.stopPropagation();},true);
          elements[id].oncontextmenu = null; }
      document.getElementsByClassName("VidiPlayerstyles__VideoAdContainer-sc-qzp347-20 gcTUvL")[0].classList.add("notranslate");
  }

}));
