import { parseVttCues, squashCues } from "../content/utils";

const segment0Vtt = `
WEBVTT
X-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:0

1
00:01.000 --> 00:02.100 align:start position:10% line:90%,end
<b>-C'est bien beau manger trois</b>

2
00:02.133 --> 00:03.233 align:center line:90%,end
<b>-C'est bien beau manger trois</b>
<b>fois par jour, mais c'est encore</b>

3
00:03.267 --> 00:04.317 align:start position:10% line:90%,end
<b>-C'est bien beau manger trois</b>
<b>fois par jour, mais c'est encore</b>
<b>mieux quand on peut partager</b>

4
00:04.350 --> 00:05.450 align:start position:10% line:90%,end
<b>fois par jour, mais c'est encore</b>
<b>mieux quand on peut partager</b>
<b>ces moments avec des gens qu'on</b>

5
00:05.483 --> 00:07.083 align:start position:10% line:90%,end
<b>mieux quand on peut partager</b>
<b>ces moments avec des gens qu'on</b>
<b>aime. Pour souligner la fin de</b>

6
00:07.117 --> 00:08.217 align:start position:10% line:90%,end
<b>ces moments avec des gens qu'on</b>
<b>aime. Pour souligner la fin de</b>
<b>la saison, j'ai invitÃ© tout le</b>

7
00:08.250 --> 00:09.350 align:start position:10% line:90%,end
<b>aime. Pour souligner la fin de</b>
<b>la saison, j'ai invitÃ© tout le</b>
<b>monde pour une grande tablÃ©e.</b>

8
00:09.383 --> 00:10.433 align:start position:10% line:90%,end
<b>la saison, j'ai invitÃ© tout le</b>
<b>monde pour une grande tablÃ©e.</b>
<b>Avec Simon et Loounie,</b>

9
00:10.467 --> 00:11.433 align:start position:10% line:90%,end
<b>monde pour une grande tablÃ©e.</b>
<b>Avec Simon et Loounie,</b>
<b>on s'occupe du repas,</b>

10
00:11.467 --> 00:13.017 align:start position:10% line:90%,end
<b>Avec Simon et Loounie,</b>
<b>on s'occupe du repas,</b>
<b>et avec Florence et LÃ©a,</b>

11
00:13.050 --> 00:14.100 align:start position:10% line:90%,end
<b>on s'occupe du repas,</b>
<b>et avec Florence et LÃ©a,</b>
<b>j'apprends les rudiments</b>

12
00:14.133 --> 00:15.200 align:start position:10% line:90%,end
<b>et avec Florence et LÃ©a,</b>
<b>j'apprends les rudiments</b>
<b>d'une rÃ©ception zÃ©ro dÃ©chet</b>

13
00:15.233 --> 00:16.300 align:start position:10% line:90%,end
<b>j'apprends les rudiments</b>
<b>d'une rÃ©ception zÃ©ro dÃ©chet</b>
<b>rÃ©ussie. Bernard, lui, bien...</b>

14
00:16.333 --> 00:17.400 align:start position:10% line:90%,end
<b>d'une rÃ©ception zÃ©ro dÃ©chet</b>
<b>rÃ©ussie. Bernard, lui, bien...</b>
<b>il va juste manger.</b>

15
00:17.433 --> 00:20.050 align:start position:10% line:90%,end
<b>rÃ©ussie. Bernard, lui, bien...</b>
<b>il va juste manger.</b>
<b>Il a compris, lui.</b>

16
00:20.083 --> 00:23.083 align:start position:10% line:90%,end
<b>il va juste manger.</b>
<b>Il a compris, lui.</b>
<b>(indicatif musical)</b>
`

const expected = [
`-C'est bien beau manger trois fois par jour, mais c'est encore mieux quand on peut partager`,
`ces moments avec des gens qu'on aime. Pour souligner la fin de la saison, j'ai invitÃ© tout le`
`monde pour une grande tablÃ©e. Avec Simon et Loounie, on s'occupe du repas,`,
`et avec Florence et LÃ©a, j'apprends les rudiments d'une rÃ©ception zÃ©ro dÃ©chet`,
`rÃ©ussie. Bernard, lui, bien... il va juste manger. Il a compris, lui.`,
`(indicatif musical)`]

test('squash cues batch 1', async () => {
    const cues = await parseVttCues(segment0Vtt)
    const res = squashCues(cues);
    expect(res.length).toBe(6);
    for (const [index, actualCue] of res.entries()) {
        expect(actualCue.text).toBe(expected[index]);
    }
});
