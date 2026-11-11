# Programme guide

The yellow key cycles Recordings → Channels → Guide → Recordings (Samsung apps and Google TV;
on Google TV also the Guide tab).

- Rows are the channels of a bouquet: the one open in the channel list, otherwise the one used last
  (`epgBouquet` in the app settings), otherwise the first bouquet.
- Columns are time: 2.5 hours at a time, starting from the current half hour; the window never
  goes into the past (OpenWebif `epgservice` returns events from now on).
- Events are loaded per channel with `/api/epgservice?sRef=` for the visible rows and a few rows
  below them, at most two requests at a time, and cached for 30 minutes. One request per channel
  is slower than `epgmulti` but has the same, documented behaviour on every OpenWebif version.
- Keys: ▲▼ channel, ◀▶ programme, CH +/− page, ◀◀ ▶▶ ±2 h, OK on the running programme (or a
  channel without data) watches the channel, OK on a coming programme / INFO shows its details,
  RETURN back to the channel list.
- Timers: red (or REC) on a programme adds a timer with `/api/timeraddbyeventid` (the EPG event
  id), or deletes the timer that records it (`/api/timerdelete`). Programmes with a timer are
  marked with a red bar and ●; a timer counts as the programme's when it has the same event id or
  covers more than half of it (so timers made on the box with margins match too). The details
  dialog has the same Record / Delete timer button.
- Watching from the guide fills the INFO data of the live player at once from the guide's own
  events and then loads now/next of the bouquet, as opening the bouquet in the channel list does.
- Watching from the guide makes the channel list follow the guide's bouquet, so CH +/− works
  during playback; after playback the guide is shown again.

Web: `Views.epg` in `widget/js/views.js` (its DOM is created in JS, see AGENTS.md).
Android: `EpgGridView.kt` (drawn on a canvas so that the D-pad moves between programmes) and the
guide part of `MainActivity.kt`.

The design follows the multi-EPG timeline of dreamDroid (channels × time with a time header).
