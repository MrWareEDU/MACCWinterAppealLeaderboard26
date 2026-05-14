// ============================================================
//  WINTER APPEAL LEADERBOARD — CONFIGURATION
//
//  Edit the values in this file to set up the leaderboard.
//  Instructions: open setup.html for a step-by-step guide.
// ============================================================

const CONFIG = {

    // ----------------------------------------------------------
    //  Google Sheet
    //
    //  Paste your Google Sheet ID here.
    //  Find it in the Sheet URL:
    //    docs.google.com/spreadsheets/d/ >>> THIS PART <<< /edit
    // ----------------------------------------------------------
    SHEET_ID: 'YOUR_GOOGLE_SHEET_ID_HERE',

    // The tab GID. Leave as '0' if you are using the first tab.
    // If you use a different tab, find the gid= value in the URL
    // when that tab is open.
    SHEET_GID: '0',

    // ----------------------------------------------------------
    //  Display
    // ----------------------------------------------------------

    // Short school name shown in the header badge.
    SCHOOL_NAME: 'MACC',

    // Year displayed in the leaderboard heading.
    APPEAL_YEAR: '2026',

    // ----------------------------------------------------------
    //  Refresh interval
    //  How often the page checks for updated data (in seconds).
    // ----------------------------------------------------------
    REFRESH_INTERVAL: 30,

};
