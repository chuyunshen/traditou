# Traditou

It intercepts the original subtitle files sent from the website servers, parses them and displays the original subtitles along with auto-translated English subtitles on the bottom.

This extension can be used with the trifecta of French Canadian streaming websites:  [Tou.tv](https://ici.tou.tv/),  [Noovo.ca](https://noovo.ca), and  [TeleQuebec](https://video.telequebec.tv/), with the goal of French language learning in mind.

Traditou not only matches words closely, it also transforms TV-style rolling captions (which are visually difficult to follow) into more readable streaming service style subtitles.
<style>
    #main-image {
    margin: 40px; 
    margin-bottom: 70px;;
    border-radius: 5px; 
    outline-style: solid; 
    outline-width: 1px; 
    outline-color: grey; 
    box-shadow:inset 0 1px 0 rgba(255,255,255,.6), 0 22px 70px 4px rgba(0,0,0,0.56), 0 0 0 1px rgba(0, 0, 0, 0.0); 
    filter: grayscale(20%);
    width: 500px;
  }
</style>
<img src="images/telequebec_screenshot.png" id="main-image">
<img src="images/demo.gif" width="550px" style="margin-left:20px">

### Quick Start
To install all the dependencies, simply do
 ```
npm install
```
To compile the content scripts:
```
rollup -c
  ```

### TODO list

- Fix the bug where a line is shown multiple times (downloaded multiple times)
- Test on Chrominium and Edge
- Make it compatible with TV5Unis
- Fix starttime endtime problem
- write tests for squashCues
- Look into differentiating French and English subtitle colours
- Move up the subtitles box when the hover menu is on
- Translate the info page to french
- Dark mode for the popup panel and the info page
- Tooltips for select options on the popup



**Soon on the Chrome Web Store**