# ImgCraft Launch Setup Documentation

## Overview
This document explains the automated launch system for ImgCraft, which shows a "Coming Soon" page before December 21, 2025, and automatically switches to the main website on that date.

## Launch Date
**December 21, 2025 at 00:00:00**

## Implementation Details

### 1. Coming Soon Page
**Location:** `coming soon/coming_soon.html`

**Features:**
- Countdown timer showing days, hours, minutes, and seconds until launch
- Email waitlist signup (stores in Supabase `email_notifications` table)
- Feature showcase of all ImgCraft tools
- Roadmap timeline
- Fully responsive design with particle animation background

**Countdown Target:** December 21, 2025 at midnight

### 2. Backend Routing Logic
**Location:** `app.py` - `index()` function (lines 897-917)

**How it works:**
```python
LAUNCH_DATE = datetime(2025, 12, 21, 0, 0, 0)
current_date = datetime.now()

if current_date < LAUNCH_DATE:
    # Show coming soon page
    return send_file('coming soon/coming_soon.html')
else:
    # Show main website
    return render_template('index.html')
```

The backend automatically checks the current date on every request to the root URL (`/`) and serves:
- **Before Dec 21:** Coming soon page
- **On/After Dec 21:** Main ImgCraft website

### 3. Launch Day Overlay
**Location:** `templates/index.html`

**Features:**
- Beautiful "We're Live! 🎉" overlay with rocket animation
- Confetti animation (50 colorful particles)
- Auto-dismisses after 5 seconds
- Can be manually dismissed by clicking "Explore Tools" button
- Only shows on launch day (within 24 hours of launch)
- Uses sessionStorage to prevent showing again after dismissal

**Trigger Logic:**
```javascript
const LAUNCH_DATE = new Date('2025-12-21T00:00:00');
const LAUNCH_OVERLAY_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Shows overlay only on launch day (within 24 hours of launch)
if (timeSinceLaunch >= 0 && timeSinceLaunch <= LAUNCH_OVERLAY_DURATION) {
    showLaunchOverlay();
}
```

## User Experience Flow

### Before Launch (Before Dec 21, 2025)
1. User visits `https://yoursite.com/`
2. Backend serves the coming soon page
3. User sees countdown timer
4. User can join waitlist by entering email
5. All other routes (tools, auth, billing) are still accessible directly

### On Launch Day (Dec 21, 2025)
1. User visits `https://yoursite.com/`
2. Backend serves the main website
3. "We're Live!" overlay appears with confetti
4. Overlay auto-dismisses after 5 seconds
5. User can explore all tools normally

### After Launch Day (After Dec 21, 2025)
1. User visits `https://yoursite.com/`
2. Backend serves the main website
3. No overlay shown (launch day has passed)
4. Normal website experience

## Testing

### Test Coming Soon Page
To test the coming soon page before launch:
1. Visit the site before Dec 21, 2025
2. OR temporarily change the `LAUNCH_DATE` in `app.py` to a future date

### Test Launch Overlay
To test the launch overlay:
1. Change the `LAUNCH_DATE` in `templates/index.html` to today's date
2. Clear sessionStorage in browser DevTools
3. Refresh the page
4. You should see the overlay with confetti

## Files Modified

1. **`coming soon/coming_soon.html`** (line 1052)
   - Updated countdown target date to Dec 21, 2025
   - Renamed from index.html to avoid confusion

2. **`app.py`** (lines 897-917)
   - Added date-based routing logic
   - Shows coming soon page before launch
   - Shows main website after launch

3. **`templates/index.html`**
   - Added launch overlay HTML (lines 27-40)
   - Added launch overlay CSS (lines 177-340)
   - Added launch overlay JavaScript (lines 464-527)

## Configuration

### Change Launch Date
To change the launch date, update the date in **TWO** locations:

1. **Backend (app.py line 907):**
```python
LAUNCH_DATE = datetime(2025, 12, 21, 0, 0, 0)
```

2. **Coming Soon Page (coming soon/coming_soon.html line 1052):**
```javascript
this.targetDate = new Date('2025-12-21T00:00:00');
```

3. **Launch Overlay (templates/index.html line 467):**
```javascript
const LAUNCH_DATE = new Date('2025-12-21T00:00:00');
```

### Disable Launch Overlay
To disable the launch overlay after launch day, simply remove or comment out the `checkLaunchDay()` call in `templates/index.html`.

## Deployment Checklist

- [x] Coming soon page countdown set to Dec 21, 2025
- [x] Backend routing logic implemented
- [x] Launch overlay created with confetti animation
- [x] All dates synchronized across files
- [ ] Test coming soon page on staging
- [ ] Test launch overlay on staging
- [ ] Verify email waitlist functionality
- [ ] Deploy to production (Render)

## Notes

- The coming soon page is **static** and doesn't require backend connection
- Email waitlist uses Supabase for storage
- Launch overlay uses sessionStorage (resets when browser is closed)
- All animations are CSS-based for performance
- Fully responsive on mobile, tablet, and desktop

## Support

For issues or questions about the launch system, check:
1. Browser console for JavaScript errors
2. Flask logs for backend routing issues
3. Supabase dashboard for email waitlist data
