export function convertTTMLtoVTT(ttmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(ttmlString, 'application/xml');

    const ttmlNamespaceURI = 'http://www.w3.org/ns/ttml';
    const body = xmlDoc.getElementsByTagNameNS(ttmlNamespaceURI, 'body')[0];

    if (!body) {
        console.error('No <body> element found in the TTML document.');
        return '';
    }

    let vttString = `WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:0\n\n`; 
    const paragraphs = body.children[0].children

    for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];

        // Extract attributes from the <p> element
        const beginTime = paragraph.getAttribute('begin');
        const endTime = paragraph.getAttribute('end');
        const textContent = paragraph.innerHTML.replace(`<br xmlns="http://www.w3.org/ns/ttml"/>`, " ").replace(/  +/g, ' ').trim();

        // Format the result in VTT style
        const vttResult = `${i + 1}\n${beginTime} --> ${endTime} \n<b>${textContent}</b>\n\n`;
        vttString = vttString.concat(vttResult)
    }

    return vttString;
}