# Implementation Checklist

Use this checklist to implement the refactored architecture in your project.

## ✅ Phase 1: Setup Core Architecture (Estimated: 2 hours)

- [ ] Copy `VideoPlayerAdapter.js` to content folder
- [ ] Copy `serviceConfigs.js` to content folder
- [ ] Copy `REFACTORING_GUIDE.md` to content folder
- [ ] Review `VideoPlayerAdapter.js` for any project-specific needs
- [ ] Verify all imported functions exist in `utils.js`
- [ ] Test adapter initialization with a simple config

## ✅ Phase 2: Create Refactored Scripts (Estimated: 1 hour)

### Telequebec
- [ ] Create `telequebec_content_refactored.js`
- [ ] Test with Telequebec video player
- [ ] Verify subtitles appear correctly
- [ ] Check all modes work (dual/english/french/off)

### Prime Video
- [ ] Create `prime_content_refactored.js`
- [ ] Test with Prime Video player
- [ ] Verify subtitles appear correctly
- [ ] Check all modes work

### Noovo
- [ ] Create `noovo_content_refactored.js`
- [ ] Test with Noovo player
- [ ] Verify subtitles appear correctly
- [ ] Check all modes work

### Tou.tv
- [ ] Create `toutv_content_refactored.js`
- [ ] Test with Tou.tv player
- [ ] Verify subtitles appear correctly
- [ ] Check all modes work

### TV5 Unis
- [ ] Create `tv5_content_refactored.js`
- [ ] Test with TV5 player
- [ ] Verify subtitles appear correctly
- [ ] Check all modes work

## ✅ Phase 3: Testing (Estimated: 4 hours)

### Per-Service Testing
For each service, test:
- [ ] Video player loads without errors
- [ ] Console shows "running [service] content script"
- [ ] Translation wrapper appears in DOM (`div#invisible-translate-wrapper`)
- [ ] Original subtitles hidden when plugin enabled
- [ ] "Off" mode shows original subtitles
- [ ] "French-only" mode shows only French
- [ ] "English-only" mode shows only English
- [ ] "Dual" mode shows both French + English
- [ ] Subtitle font size changes with window resize
- [ ] Subtitles move up/down when user hovers over player
- [ ] No console errors in DevTools

### Comparative Testing
- [ ] New scripts behave identically to old scripts
- [ ] Subtitle timing matches old behavior
- [ ] Cue squashing works correctly
- [ ] No regression in functionality

## ✅ Phase 4: Update Manifest (Estimated: 30 minutes)

For each service, in `manifest.json`:

```json
{
  "content_scripts": [
    {
      "matches": ["https://telequebec.tv/*"],
      "js": ["content/telequebec_content_refactored.js"],
      "run_at": "document_start"
    }
  ]
}
```

- [ ] Update telequebec entry
- [ ] Update prime entry
- [ ] Update noovo entry
- [ ] Update toutv entry
- [ ] Update tv5 entry
- [ ] Verify all paths are correct
- [ ] Test manifest doesn't have syntax errors

## ✅ Phase 5: Beta Testing (Estimated: 1 week)

- [ ] Deploy to test/beta channel
- [ ] Announce to beta testers
- [ ] Collect feedback
- [ ] Monitor for errors in telemetry
- [ ] Fix any compatibility issues
- [ ] Update documentation based on issues

## ✅ Phase 6: Production Rollout (Estimated: 1 day)

- [ ] Verify all tests pass
- [ ] Final code review
- [ ] Deploy to production
- [ ] Monitor for issues (first 24 hours)
- [ ] Be ready to rollback if needed

## ✅ Phase 7: Cleanup (Estimated: 1 hour)

- [ ] Remove old content scripts (keep git history)
- [ ] Update documentation with new architecture
- [ ] Update developer onboarding guide
- [ ] Close related issues/PRs
- [ ] Create post-mortem/blog post about refactoring

## Debugging Checklist

If something breaks, work through this:

### Content Script Won't Load
- [ ] Check manifest.json syntax
- [ ] Verify URL patterns match the site
- [ ] Check DevTools → Extensions tab for errors
- [ ] Verify `run_at` is appropriate

### Adapter Won't Initialize
- [ ] Check config object has required properties
- [ ] Verify CSS selectors find elements (test in console)
- [ ] Check imports in both adapter and config
- [ ] Look for console errors in DevTools

### Subtitles Don't Appear
- [ ] Verify translation wrapper appears in DOM
- [ ] Check if Google Translate is active on page
- [ ] Verify chrome messages are being received
- [ ] Check `cueDict` has content
- [ ] Verify video text tracks were created

### Subtitles Appear But Translation Missing
- [ ] Make sure page is translated via Google Translate
- [ ] Check hidden divs have translated text
- [ ] Verify `addEnglishToOriginalCues` is finding divs
- [ ] Look for console warnings about missing elements

### Wrong Subtitles Position/Size
- [ ] Verify ResizeObserver is firing
- [ ] Check `adjustSubtitlePosition` getting correct values
- [ ] Verify `moveSubtitlesUpBy` config is set
- [ ] Test `moveSubtitlesUpBy[config.serviceName]` in console

## Performance Checklist

- [ ] Check that adapter doesn't create memory leaks
  - [ ] Observers are properly cleaned up
  - [ ] Event listeners are removed
  - [ ] DOM references released
- [ ] Profile adapter initialization time
- [ ] Verify no excessive DOM queries
- [ ] Check cue processing doesn't stall UI
- [ ] Monitor memory usage over time

## Documentation Checklist

- [ ] Update README with new architecture
- [ ] Add diagrams showing data flow
- [ ] Create developer quickstart guide
- [ ] Document how to add new services
- [ ] Include troubleshooting guide
- [ ] Add code examples for customization
- [ ] Update FAQ with new features

## Rollback Plan

If issues occur:

1. **Immediate**: Revert manifest.json to old content scripts
2. **Short-term**: Switch to old scripts in Chrome Web Store
3. **Analysis**: Review errors in new adapter
4. **Fix**: Update VideoPlayerAdapter and configs
5. **Re-test**: Verify fixes don't break anything
6. **Re-deploy**: Try again with updated code

**Rollback time**: < 30 minutes
**User impact**: Minimal (extension updates within 24 hours)

## Sign-Off

- [ ] Project lead reviewed architecture
- [ ] QA completed all test scenarios
- [ ] Beta testers gave thumbs up
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Ready for production release ✅

---

**Estimated Total Time**: 9-11 hours (spread over 1 week)
**Lines of Code Eliminated**: ~700
**New Services Added Capability**: Minutes instead of hours
