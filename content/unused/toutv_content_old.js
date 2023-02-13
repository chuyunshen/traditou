var prepareContainer = function(mutations, observer){
    for (const mutation of mutations){
        if (mutation.target.className && 
            typeof mutation.target.className === "string" && 
            mutation.target.className.includes("vjs-text-track-display")) {
            modifyVideoPlayer();
        }
    }
}
videoReadyObserver = new MutationObserver(prepareContainer);
videoReadyObserver.observe(document.documentElement, {childList:true, subtree:true});

function modifyVideoPlayer() {

    // make the video right-clickable
    var elements = document.getElementsByTagName("*");
    for(var id = 0; id < elements.length; ++id) { 
        elements[id].addEventListener('contextmenu', function(e) {e.stopPropagation()},true);
        elements[id].oncontextmenu = null; }
    document.getElementsByClassName("vjs-controls-disabled")[0].classList.add("notranslate");

    // actually the wrapper of timedtext
    timedtext = document.getElementsByClassName("vjs-controls-disabled")[0];

    const manipulateSubtitles = function(mutationsList, observer){ //Observes original text box for changes
        for (const mutation of mutationsList){
            if (mutation.target.className && (mutation.target.className.includes("vjs-text-track-display"))) {
                if (mutation.target.firstChild &&
                    mutation.target.firstChild.firstChild &&
                    mutation.target.firstChild.firstChild.firstChild &&
                    mutation.target.firstChild.innerText) {
                    trimmed_target_text = mutation.target.firstChild.innerText.replace(/\s+/g,' ').trim();
                } else {
                    trimmed_target_text = '';
                }
                if (!window.old_text) {
                    trimmed_window_old_text = '';
                } else {
                    trimmed_window_old_text = window.old_text.replace(/\s+/g,' ').trim();
                }

                text_track_container = document.getElementsByClassName("vjs-text-track-display")[0];
                if (!mutation.target.innerHTML.includes("original-subs-modified") && 
                    text_track_container &&
                    text_track_container.firstElementChild &&
                    text_track_container.firstElementChild.firstElementChild &&
                    text_track_container.firstElementChild.firstElementChild.firstElementChild) { 

                    modifyOriginalSubs(trimmed_target_text);
                    if (trimmed_target_text !== trimmed_window_old_text) {
                        addTranslatedSubs(trimmed_target_text);
                    }
                    window.old_text = trimmed_target_text;
                }

                this.disconnect(); //stop observer so I can add subs without triggering this infinitely
            }
        }
    };
    translationObserver = new MutationObserver(manipulateSubtitles);
    translationObserver.observe(timedtext, {characterData: true, childList: true, subtree: true});
}

// caption_row is the video wrapper
var modifyOriginalSubs = function(final_innerText){ 
    text_track_container = document.getElementsByClassName("vjs-text-track-display")[0];
    text_track_container.style.position = "unset";
    level1 = text_track_container.firstElementChild; 
    level1.classList.add("original-subs-modified");
    
    level2 = text_track_container.firstElementChild.firstElementChild; 
    level2.style.fontSize = "18px";
    level2.style.whiteSpace = "normal";
    level2.style.maxHeight = "fit-content";
    level3 = text_track_container.firstElementChild.firstElementChild.firstElementChild; 
    level3.innerText = final_innerText;
    level3.setAttribute("translate", "no");
    // cue.setAttribute("text-align", "center");
    // text_track_container.style.display = 'block';
}

var addTranslatedSubs = function(final_innerText) {
    translated_timedtext_container = document.getElementById("translated-timedtext-container")
    if (!translated_timedtext_container) {
        translated_timedtext_container = document.createElement("div");
        translated_timedtext_container.id = "translated-timedtext-container";
        // translated_timedtext_container.className = "vjs-text-track-display";
    }
    translated_timedtext_container.innerHTML = `
        <div id='translated-timedtext-level1'>
            <div id='translated-timedtext-level2'>
                <div id='translated-timedtext-level3' translate='yes'>${final_innerText}</div>
            </div>
        </div>`;
    text_track_container = document.getElementsByClassName("vjs-text-track-display")[0];
    translated_timedtext_container.style.cssText = text_track_container.style.cssText;

    // document.getElementsByClassName("jw-captions jw-reset jw-captions-enabled")[0].appendChild(translated_timedtext_container);
    document.getElementsByClassName("vjs-controls-disabled")[0].appendChild(translated_timedtext_container);
    document.getElementById("translated-timedtext-level1").style.cssText = document.getElementsByClassName('vjs-text-track-display')[0].firstElementChild.style.cssText;
    level2 = document.getElementById("translated-timedtext-level2");
    level2.style.cssText = document.getElementsByClassName('vjs-text-track-display')[0].firstElementChild.firstElementChild.style.cssText;
    level2.style.bottom = "40px !important";
    level2.style.top = "auto !important";
    // level2.style.height = "auto !important";
    // level2.style.overflow = "auto";
    document.getElementById("translated-timedtext-level3").style.cssText = document.getElementsByClassName('vjs-text-track-display')[0].firstElementChild.firstElementChild.firstElementChild.style.cssText;
    document.getElementById("translated-timedtext-level3").style.color = "yellow";

    // original_sub_top_position = parseInt(document.getElementsByClassName('vjs-text-track-display')[0].style.top.replace("px", ""));
    // translated_timedtext_container.style.top = (original_sub_top_position + 20).toString() + "px";
    translated_timedtext_container.style.display = 'block';
    translated_timedtext_container.style.opacity = 0;

}
