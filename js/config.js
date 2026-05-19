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
    SHEET_ID: 'e/2PACX-1vSOmDnxpK9XwyzgQVLvoGacSFfqBngxeQofQ2dS-aZZHeDbSFzvYkdhPBAc0p6XPjLR735OnilHHYjZ',

    // The GID of the Leaderboard tab (NOT the Form Responses tab).
    // Find it in the Sheet URL when the Leaderboard tab is open:
    //   ...edit#gid= >>> THIS NUMBER <<<
    SHEET_GID: '1500628005',

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
