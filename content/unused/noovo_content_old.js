/* The subtitles of Noovo are also cable TV styled. A few words get rolled in and out each time. 
*/

window.old_text = "";
var onScreenFrenchTexts = {};
var textCount = 0;
var timedTextContainer;

var prepareContainer = function(mutations, observer){
    for (const mutation of mutations){
        if (mutation.target.className && 
            typeof mutation.target.className === "string" && 
            mutation.target.className.includes("jw-captions")) {
            modifyVideoPlayer();
        }
    }
}
window.initial_observer = new MutationObserver(prepareContainer);
window.initial_observer.observe(document.documentElement, {childList:true, subtree:true});

function modifyVideoPlayer() {

    // make the video right-clickable
    var elements = document.getElementsByTagName("*");
    for(var id = 0; id < elements.length; ++id) { 
        elements[id].addEventListener('contextmenu', function(e) {e.stopPropagation()},true);
        elements[id].oncontextmenu = null; }
    document.getElementsByClassName("VidiPlayerstyles__VideoAdContainer-sc-qzp347-20 gcTUvL")[0].classList.add("notranslate");

    const video = document.getElementById("vidi_player_instance_1");

    // create the new subtitles element
    let timedTextContainer = document.getElementById("timedtext-container");
    if (!timedTextContainer) {
        timedTextContainer = document.createElement("div");
        timedTextContainer.id = "timedtext-container";
        timedTextContainer.innerHTML = `
            <div id='french-subtitles' translate='no' style='font-size: 18px; position:relative; z-index:100'></div>
            <div id='english-subtitles' translate='yes' style='font-size: 18px; position:relative; z-index:100'></div>
            `;
        // document.getElementsByClassName("jw-captions jw-reset")[0].appendChild(timedTextContainer);
        video.appendChild(timedTextContainer);
    }


    const manipulateSubtitles = function(mutationsList, observer){ //Observes original text box for changes
        for (const mutation of mutationsList){
            if (mutation.target.className && (mutation.target.className.includes("jw-captions")
            || mutation.target.className.includes("jw-text-track-container")))
            {
                if (mutation.target.firstChild && mutation.target.firstChild.innerText) {
                    trimmed_target_text = mutation.target.firstChild.innerText.replace(/\s+/g,' ').trim();
                } else {
                    trimmed_target_text = '';
                }
                if (!window.old_text) {
                    trimmed_window_old_text = '';
                } else {
                    trimmed_window_old_text = window.old_text.replace(/\s+/g,' ').trim();
                }

                if (!mutation.target.innerHTML.includes("original-subs-modified")) { 
                    let [rolledOut, rolledIn] = getNewlyRolledInAndOutText(trimmed_window_old_text, trimmed_target_text);
                    text_track_container = document.getElementsByClassName("jw-text-track-container jw-reset")[0];
                    if (text_track_container) {
                        text_track_container.style.display = 'none'; // reduce flickering of the original text box 
                    } else {
                        return;
                    }
                    cues = document.getElementsByClassName('jw-text-track-cue jw-reset');
                    if (cues.length === 0) return;
                    cue = document.getElementsByClassName('jw-text-track-cue jw-reset')[0]
                    cue.classList.add("original-subs-modified");

                    if (trimmed_target_text !== trimmed_window_old_text) {
                        const justRemovedTextIds = modifyOriginalSubs(rolledOut, rolledIn);
                        addTranslatedSubs(rolledOut, rolledIn, justRemovedTextIds);
                    }
                    window.old_text = trimmed_target_text;
                }

                this.disconnect(); //stop observer so I can add subs without triggering this infinitely
            }
        }
    };
    window.observer = new MutationObserver(manipulateSubtitles);
    window.observer.observe(video, {characterData: true, childList: true, subtree: true});
}

// caption_row is the video wrapper
var modifyOriginalSubs = function(rolledOut, rolledIn){ 
    // cue.innerText=final_innerText;
    // cue.style.fontSize = "18px";

    let combinedCharCount = rolledIn.length;
    for (const key in onScreenFrenchTexts) {
        combinedCharCount += onScreenFrenchTexts[key].length;
    }

    let justRemovedTextIds = [];
    if (combinedCharCount > 120) {
        for (const textIdToRemove in onScreenFrenchTexts) {
            document.getElementById("french-" + textIdToRemove).remove();
            delete onScreenFrenchTexts[textIdToRemove];
            justRemovedTextIds.push(textIdToRemove);
        }
    }

    let rolledInSpan = document.createElement("span");
    rolledInSpan.id = "french-" + textCount;
    rolledInSpan.innerText = rolledIn;
    document.getElementById("french-subtitles").appendChild(rolledInSpan);
    onScreenFrenchTexts[textCount] = rolledIn;

    return justRemovedTextIds;

    // cue.setAttribute("translate", "no");
    // cue.setAttribute("white-space", "normal");
    // cue.setAttribute("text-align", "center");
    // text_track_container.style.display = 'block';
}

/*
example inputs:
    oldText = "comment j'ai hâte de ça. Que commence... (Mégaphone)"
    newText = "Que commence... (Mégaphone) L'ultime"
returns: 
    "comment j'ai hâte de ça. ", "L'ultime" 
*/
function getNewlyRolledInAndOutText(oldText, newText) {
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

var addTranslatedSubs = function(rolledOut, rolledIn, justRemovedTextIds) {
    // this is the french that's being presented on screen right now;
    translated_timedtext_container = document.getElementById("translated-timedtext-container")
    let englishSubtitles = document.getElementById("english-subtitles");
    
    for (const textIdToRemove of justRemovedTextIds) {
        document.getElementById("english-" + textIdToRemove).remove();
    }

    let rolledInSpan = document.createElement("span");
    rolledInSpan.id = "english-" + textCount;
    textCount++;
    rolledInSpan.innerText = rolledIn;
    englishSubtitles.appendChild(rolledInSpan);

    // if (newlyRolledInText && translated_timedtext_container) {
    //     translated_timedtext_inner = document.getElementById("translated-timedtext-inner");
    //     translated_timedtext_inner.appendChild(newlyRolledInTextSpan);
    //     // for (const text of translatedFrenchTexts){
    //     //     translated_timedtext_inner.removeChild(translated_timedtext_inner.firstChild);
    //     // }
    // } else {
    //     translated_timedtext_container = document.getElementById("translated-timedtext-container")
    //     if (!translated_timedtext_container) {
    //         translated_timedtext_container = document.createElement("div");
    //         translated_timedtext_container.id = "translated-timedtext-container";
    //     }
    //     translated_timedtext_container.innerHTML = `
    //         <div id='translated-timedtext-inner' translate='yes' style='font-size: 18px'>
    //             <span class='translated-timedtext-text'>${newText}</span>
    //         </div>`;
    // }
    // text_track_container = document.getElementsByClassName("jw-text-track-container jw-reset")[0];
    // translated_timedtext_container.style.cssText = text_track_container.style.cssText;

    // // document.getElementsByClassName("jw-captions jw-reset jw-captions-enabled")[0].appendChild(translated_timedtext_container);
    // document.getElementsByClassName("jw-wrapper jw-reset")[0].appendChild(translated_timedtext_container);
    // translated_timedtext_inner = document.getElementById("translated-timedtext-inner");
    // translated_timedtext_inner.style.cssText = document.getElementsByClassName('jw-text-track-display jw-reset')[0].style.cssText;

    // translated_timedtext_inner.style.fontSize = "18px";
    // original_sub_top_position = parseInt(document.getElementsByClassName('jw-text-track-display jw-reset')[0].style.top.replace("px", ""));
    // translated_timedtext_inner.style.top = (original_sub_top_position + 20).toString() + "px";
    // let textSpans = document.getElementsByClassName("translated-timedtext-text");
    // for (const span of textSpans) {
    //     span.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    // }

    // translated_timedtext_container.style.display = 'block';
}