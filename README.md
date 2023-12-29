# Traditou

Find it on the <a href="https://chrome.google.com/webstore/detail/traditou/bkjdjjgheofjpchhfpbnfcaklcboaoob" target="_blank">Chrome Web Store</a>.

It intercepts the original subtitle files sent from the website servers, parses them and displays the original subtitles along with auto-translated English subtitles on the bottom.

This extension can be used with the a number of streaming websites: [Prime Video](https://primevideo.com), [Tou.tv](https://ici.tou.tv/), [Noovo.ca](https://noovo.ca), [TeleQuebec](https://video.telequebec.tv/), [TV5Unis](https://www.tv5unis.ca) with the goal of French language learning in mind.

Traditou not only matches words closely, it also transforms TV-style rolling captions (which are visually difficult to follow) into more readable streaming service style subtitles.

<img src="images/telequebec_screenshot_with_border2.png">
<img src="images/demo.gif" style="margin-left:20px">

### Quick Start
To install all the dependencies, simply do
 ```
npm install
```

To compile the content scripts:

```
rollup -c
```

Prepare for another Chrome Web Store release:
```
zip -r traditou.zip traditou  -x "**/node_modules/*" -x "**/.git/*" -x "**/.DS_Store" -x "**/content/*" -x "**/tests/*" -x "**/package.json" -x "**/package-lock.json" -x "**/.gitignore" -x "**/rollup.config.js" -x "**/images/*"
```

### TODO list

- Add instructions for Windows and Linux for adjusting subtitle appearances in settings
- Add comments to code
- Make the subtitle button always enabled, so subtitles will be sent from the server
- Test on Chromium
- Look into differentiating French and English subtitle colours
- Translate the info page to french
- Dark mode for the popup panel and the info page
- Tooltips for select options on the popup

### Testing steps before new release:
- Test on Chrome, Edge, and Chromium
