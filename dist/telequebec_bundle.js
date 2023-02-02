(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
})((function () {
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

  function squashCues(cues) {
      let squashedCues = [];
      let startTime;
      let rollingLines = [];
      let displayed = [];
      let cueIdCount = 0;
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
          // if (!startTime) {
          //     startTime = cues[cues.length - 1].startTime;
          // }
          let newCue = new VTTCue(startTime, cues[cues.length - 1].endTime, rollingLines.join(" "));
          newCue.id = cueIdCount;
          squashedCues.push(newCue);
      }
      return squashedCues; // this startTime is for the next batch
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


  function addEnglishToOriginalCues(host, cueDict, processedCueIds, video) {
      let notYetTranslatedCueDict = {};
      for (let cueId in cueDict) {
          let cue = cueDict[cueId];
          if (processedCueIds.includes(cue.id)) continue;
          cue.bilingualLines = [];
          const div = document.getElementById("translate" + cue.id);
          if (div) {
              const frenchLine = cue.text.trim();
              const englishLine = div.innerText.trim();
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
              cue.text = cue.bilingualLines.join("\n");
          } else {
              console.log("div cant be found");
          }
      }
      // // TODO
      // let track =  document.getElementById("français");
      // if (track) {
      //     track.track.mode = "hidden";
      // }

      let bilingualTrack;
      function createBilingualTrack(video) {
          bilingualTrack = video.addTextTrack("captions", "bilingual-captions", "fr-en", );
          bilingualTrack.id = "bilingual-track";
          bilingualTrack.mode = "showing";
          return bilingualTrack;
      }
      if (host === "telequebec") {
          if (video.textTracks.length == 2) {
              let bilingualTrack = createBilingualTrack(video);
              video.append(bilingualTrack);
          } else {
              bilingualTrack = video.textTracks[2];
              bilingualTrack.mode = "showing";
          }
      } else if (host === "noovo" || host === "toutv") {
          if (video.textTracks.length == 0) {
              let bilingualTrack = createBilingualTrack(video);
              video.append(bilingualTrack);
          } else {
              bilingualTrack = video.textTracks[0];
              bilingualTrack.mode = "showing";
          }
      }
      for (const cueId in cueDict) {
          let cue = cueDict[cueId];
          bilingualTrack.addCue(cue);
      }
      cueDict = notYetTranslatedCueDict;

      return [cueDict, processedCueIds];
  }

  // telequebec uses brightcove to manage their videos, so first I need to find the vtt files from the networks requests/responses.

  // const utils = require("./utils");
  // cueDict is a dictionary of cues to be processed (just downloaded).
  var cueDict = {};  // it's a global variable because there doesnt seem to be ways to pass extra params into the mutation observer.
  var processedCueIds = [];


  var prepareContainer = function(mutations, observer){
      for (const mutation of mutations){
          if (mutation.target.tagName === "VIDEO") {
              let track =  document.getElementById("français");
              // if (track) {track.remove()} // cannot remove the original track, because if it's removed, the network no longer sends vtt files.
              if (track) {
                  track.track.mode = "hidden";
              }
          }
      }
  };
  window.initial_observer = new MutationObserver(prepareContainer);
  window.initial_observer.observe(document.documentElement, {characterData: true, childList:true, subtree:true});


  let wrapper = createWrapper(document);
  document.body.appendChild(wrapper);
  window.observer = new MutationObserver(addEnglishToOriginalCuesWrapper);
  window.observer.observe(wrapper, {characterData: true, subtree: true});

  chrome.runtime.onMessage.addListener(async function (response, sendResponse) {
      const vtt = response["original_vtt"];
      let cues = await parseVttCues(vtt);
      cues = squashCues(cues);
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
      createTranslateElements(cues, getWrapper(document));
      return true;
  });


  function addEnglishToOriginalCuesWrapper(mutations, observer) {
      [cueDict, processedCueIds] = addEnglishToOriginalCues("telequebec", cueDict, processedCueIds, document.getElementById("player_html5_api"));
  }

  addRule("video::cue", {
      /* this background setting works for PCs, but not apple products. 
      For apple products, this setting is actually in settings->accessibility->captions
      */
      background: "transparent", 
      color: "white",
      "font-size": "18px",
  });

}));
