(function () {
    'use strict';

    // ── State ────────────────────────────────────────────

    const state = {
        rows:        [],
        prevRows:    [],
        prevRanks:   {},
        onFire:      new Set(),
        lastUpdated: null,
        firstLoad:   true,
    };

    // ── Data fetching ──────────────────────────────────────

    function sheetURL() {
        return (
            'https://docs.google.com/spreadsheets/d/' +
            CONFIG.SHEET_ID +
            '/pub?gid=' +
            CONFIG.SHEET_GID +
            '&single=true&output=csv'
        );
    }

    async function fetchData() {
        const res = await fetch(sheetURL(), { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        return parseCSV(text);
    }

    // ── CSV parser ───────────────────────────────────────

    function parseCSVLine(line) {
        const fields = [];
        let current  = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        fields.push(current.trim());
        return fields;
    }

    function parseCSV(text) {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const fields    = parseCSVLine(line);
            const careGroup = fields[0] || '';
            const yearGroup = fields[1] || '';
            const boxes     = parseInt(fields[2], 10);
            const prevBoxes = parseInt(fields[3], 10);
            if (careGroup) {
                rows.push({
                    careGroup,
                    yearGroup,
                    boxes:     isNaN(boxes) ? 0 : boxes,
                    prevBoxes: isNaN(prevBoxes) ? null : prevBoxes,
                });
            }
        }
        return rows;
    }

    // ── Ranking ──────────────────────────────────────────────

    function rankRows(rows) {
        const sorted = rows.slice().sort(function (a, b) {
            return b.boxes - a.boxes;
        });

        let rank = 1;
        return sorted.map(function (row, i) {
            if (i > 0 && sorted[i].boxes < sorted[i - 1].boxes) {
                rank = i + 1;
            }
            return Object.assign({}, row, { rank: rank });
        });
    }

    // ── Rendering ──────────────────────────────────────────

    function renderHeader() {
        const school = document.getElementById('schoolName');
        const title  = document.getElementById('appealTitle');
        if (school) school.textContent = CONFIG.SCHOOL_NAME;
        if (title)  title.textContent  = 'Winter Appeal ' + CONFIG.APPEAL_YEAR;
    }

    function renderAssemblyPanel() {
        const rows = state.rows;

        const total = rows.reduce(function (s, r) { return s + r.boxes; }, 0);

        const yearTotals = {};
        rows.forEach(function (r) {
            if (r.yearGroup) {
                yearTotals[r.yearGroup] = (yearTotals[r.yearGroup] || 0) + r.boxes;
            }
        });
        const yearEntries  = Object.entries(yearTotals).sort(function (a, b) { return b[1] - a[1]; });
        const leadingYear  = yearEntries.length ? yearEntries[0][0] : '—';
        const leadingTotal = yearEntries.length ? yearEntries[0][1] + ' donations' : '';

        const fireGroups = Array.from(state.onFire);
        const fireCount  = fireGroups.length;
        const fireDetail = fireGroups.length
            ? fireGroups.slice(0, 3).join(', ') + (fireGroups.length > 3 ? ' +' + (fireGroups.length - 3) + ' more' : '')
            : 'none since last count';

        let biggestGroup = '—', biggestGain = 0, biggestDetail = '';
        rows.forEach(function (row) {
            if (row.prevBoxes !== null) {
                const gain = row.boxes - row.prevBoxes;
                if (gain > biggestGain) {
                    biggestGain   = gain;
                    biggestGroup  = row.careGroup;
                    biggestDetail = '+' + gain + ' from last count';
                }
            }
        });

        function set(id, val) {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        }

        set('statTotalVal',    total);
        set('statYearVal',     leadingYear);
        set('statYearDetail',  leadingTotal);
        set('statFireVal',     fireCount || '—');
        set('statFireDetail',  fireDetail);
        set('statJumpVal',     biggestGroup);
        set('statJumpDetail',  biggestDetail);
    }

    function renderPodium() {
        const el = document.getElementById('assemblyPodium');
        if (!el) return;
        const ranked = rankRows(state.rows);
        const top3   = ranked.slice(0, 3);

        // Classic podium order: 2nd | 1st | 3rd
        const order    = [top3[1], top3[0], top3[2]];
        const posClass = ['pos-2', 'pos-1', 'pos-3'];
        const medals   = ['🥈', '🥇', '🥉'];

        el.innerHTML = order.map(function (row, i) {
            if (!row) return '';
            const isOnFire  = state.onFire.has(row.careGroup);
            const fireClass = isOnFire ? ' on-fire' : '';
            const gain      = (row.prevBoxes !== null && row.boxes > row.prevBoxes) ? row.boxes - row.prevBoxes : 0;
            const prevRank  = state.prevRanks[row.careGroup];
            const rankDelta = prevRank ? prevRank - row.rank : 0;

            return (
                '<div class="podium-block ' + posClass[i] + fireClass + '">' +
                    '<div class="podium-medal">' + medals[i] + '</div>' +
                    '<div class="podium-name">' +
                        escapeHTML(row.careGroup) +
                        (isOnFire ? '<span class="fire-badge">🔥</span>' : '') +
                    '</div>' +
                    (row.yearGroup
                        ? '<div class="podium-year">' + escapeHTML(row.yearGroup) + '</div>'
                        : '') +
                    (rankDelta > 0
                        ? '<div class="podium-rank-change rank-up-ind">↑' + rankDelta + ' place' + (rankDelta > 1 ? 's' : '') + '</div>'
                        : '') +
                    (rankDelta < 0
                        ? '<div class="podium-rank-change rank-dn-ind">↓' + Math.abs(rankDelta) + ' place' + (Math.abs(rankDelta) > 1 ? 's' : '') + '</div>'
                        : '') +
                    '<div class="podium-count">' +
                        row.boxes + ' donation' + (row.boxes === 1 ? '' : 's') +
                        (gain > 0 ? '<span class="gain-tag">+' + gain + '</span>' : '') +
                    '</div>' +
                '</div>'
            );
        }).join('');
    }

    function renderAssemblyRest() {
        const el = document.getElementById('assemblyRest');
        if (!el) return;
        const ranked = rankRows(state.rows);
        const rest   = ranked.slice(3, 11);

        el.innerHTML = rest.map(function (row) {
            const isOnFire  = state.onFire.has(row.careGroup);
            const gain      = (row.prevBoxes !== null && row.boxes > row.prevBoxes) ? row.boxes - row.prevBoxes : 0;
            const prevRank  = state.prevRanks[row.careGroup];
            const rankDelta = prevRank ? prevRank - row.rank : 0;

            return (
                '<div class="rest-item' + (isOnFire ? ' on-fire' : '') + '">' +
                    '<span class="rest-rank">' + row.rank + '</span>' +
                    '<div class="rest-info">' +
                        '<span class="rest-name">' +
                            escapeHTML(row.careGroup) +
                            (isOnFire ? ' 🔥' : '') +
                        '</span>' +
                        (rankDelta > 0
                            ? '<span class="rank-change rank-up-ind">↑' + rankDelta + '</span>'
                            : '') +
                        (rankDelta < 0
                            ? '<span class="rank-change rank-dn-ind">↓' + Math.abs(rankDelta) + '</span>'
                            : '') +
                    '</div>' +
                    '<span class="rest-count">' +
                        row.boxes +
                        (gain > 0 ? ' <span class="gain-tag">+' + gain + '</span>' : '') +
                    '</span>' +
                '</div>'
            );
        }).join('');
    }

    function renderLastUpdated() {
        const el = document.getElementById('lastUpdated');
        if (!el || !state.lastUpdated) return;
        const t = state.lastUpdated.toLocaleTimeString('en-AU', {
            hour:   '2-digit',
            minute: '2-digit',
        });
        el.textContent = 'Last updated ' + t;
    }

    // ── Load cycle ───────────────────────────────────────────

    async function load() {
        const loadingEl = document.getElementById('loadingState');
        const errorEl   = document.getElementById('errorState');
        const detailEl  = document.getElementById('errorDetail');

        try {
            const rows = await fetchData();

            const prevRanked = rankRows(state.rows);
            state.prevRanks  = {};
            prevRanked.forEach(function (r) { state.prevRanks[r.careGroup] = r.rank; });
            state.prevRows   = state.rows.slice();

            state.onFire = new Set();
            rows.forEach(function (row) {
                if (row.prevBoxes !== null && row.boxes > row.prevBoxes) {
                    state.onFire.add(row.careGroup);
                }
            });

            state.rows        = rows;
            state.lastUpdated = new Date();

            if (state.firstLoad) {
                loadingEl.classList.add('hidden');
                state.firstLoad = false;
            }
            errorEl.classList.add('hidden');

            renderLastUpdated();
            renderAssemblyPanel();
            renderPodium();
            renderAssemblyRest();

        } catch (err) {
            if (state.firstLoad) {
                loadingEl.classList.add('hidden');
                errorEl.classList.remove('hidden');
                if (detailEl) detailEl.textContent = err.message;
            }
        }
    }

    // ── Utilities ────────────────────────────────────────────

    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ── Init ─────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', function () {
        renderHeader();
        load();
        setInterval(load, CONFIG.REFRESH_INTERVAL * 1000);
    });

}());
