(function () {
    'use strict';

    // ── State ────────────────────────────────────────────

    const state = {
        rows: [],
        activeFilter: 'all',
        lastUpdated: null,
        firstLoad: true,
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
        let current = '';
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
            const fields = parseCSVLine(line);
            const careGroup = fields[0] || '';
            const yearGroup = fields[1] || '';
            const boxes = parseInt(fields[2], 10);
            if (careGroup) {
                rows.push({
                    careGroup,
                    yearGroup,
                    boxes: isNaN(boxes) ? 0 : boxes,
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

    // ── Filtering ──────────────────────────────────────────

    function filteredRows() {
        if (state.activeFilter === 'all') return state.rows;
        return state.rows.filter(function (r) {
            return r.yearGroup === state.activeFilter;
        });
    }

    function yearGroups() {
        const seen = {};
        const groups = [];
        state.rows.forEach(function (r) {
            if (r.yearGroup && !seen[r.yearGroup]) {
                seen[r.yearGroup] = true;
                groups.push(r.yearGroup);
            }
        });
        return groups.sort();
    }

    // ── Rendering ──────────────────────────────────────────

    function renderHeader() {
        const school = document.getElementById('schoolName');
        const title  = document.getElementById('appealTitle');
        if (school) school.textContent = CONFIG.SCHOOL_NAME;
        if (title)  title.textContent  = 'Winter Appeal ' + CONFIG.APPEAL_YEAR;
    }

    function renderFilters() {
        const nav    = document.getElementById('yearFilters');
        const groups = yearGroups();

        if (groups.length <= 1) {
            nav.innerHTML = '';
            return;
        }

        const all = ['all'].concat(groups);
        nav.innerHTML = all.map(function (g) {
            const label  = g === 'all' ? 'All Years' : g;
            const active = g === state.activeFilter ? ' active' : '';
            return (
                '<button class="filter-btn' + active + '" data-filter="' + g + '">' +
                escapeHTML(label) +
                '</button>'
            );
        }).join('');

        nav.querySelectorAll('.filter-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                state.activeFilter = btn.dataset.filter;
                renderFilters();
                renderList();
            });
        });
    }

    function renderList() {
        const list = document.getElementById('leaderboardList');
        const rows = rankRows(filteredRows());

        if (rows.length === 0) {
            list.innerHTML =
                '<li class="leaderboard-empty">No data to display.</li>';
            list.classList.remove('hidden');
            return;
        }

        const maxBoxes = rows[0].boxes || 1;

        list.innerHTML = rows.map(function (row) {
            const pct       = Math.max(2, Math.round((row.boxes / maxBoxes) * 100));
            const medalClass = row.rank === 1 ? ' gold'
                             : row.rank === 2 ? ' silver'
                             : row.rank === 3 ? ' bronze'
                             : '';

            return (
                '<li class="leaderboard-item' + medalClass + '">' +
                    '<span class="rank">' + row.rank + '</span>' +
                    '<div class="group-info">' +
                        '<span class="group-name">' + escapeHTML(row.careGroup) + '</span>' +
                        (row.yearGroup
                            ? '<span class="year-tag">' + escapeHTML(row.yearGroup) + '</span>'
                            : '') +
                    '</div>' +
                    '<span class="box-count">' + row.boxes + ' donation' + (row.boxes === 1 ? '' : 's') + '</span>' +
                    '<div class="progress-track">' +
                        '<div class="progress-fill" style="width:' + pct + '%"></div>' +
                    '</div>' +
                '</li>'
            );
        }).join('');

        list.classList.remove('hidden');
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
        const listEl    = document.getElementById('leaderboardList');

        try {
            const rows = await fetchData();

            state.rows       = rows;
            state.lastUpdated = new Date();

            if (state.firstLoad) {
                loadingEl.classList.add('hidden');
                state.firstLoad = false;
            }
            errorEl.classList.add('hidden');

            renderFilters();
            renderList();
            renderLastUpdated();

        } catch (err) {
            if (state.firstLoad) {
                loadingEl.classList.add('hidden');
                errorEl.classList.remove('hidden');
                if (detailEl) detailEl.textContent = err.message;
                listEl.classList.add('hidden');
            }
        }
    }

    // ── Assembly view ──────────────────────────────────────

    function initAssemblyButton() {
        const btn = document.getElementById('btnAssembly');
        if (!btn) return;

        btn.addEventListener('click', function () {
            const app = document.getElementById('app');
            if (!document.fullscreenElement) {
                if (app.requestFullscreen) {
                    app.requestFullscreen();
                }
                document.body.classList.add('assembly-mode');
                btn.textContent = 'Exit Assembly View';
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
                document.body.classList.remove('assembly-mode');
                btn.textContent = 'Assembly View';
            }
        });

        document.addEventListener('fullscreenchange', function () {
            if (!document.fullscreenElement) {
                document.body.classList.remove('assembly-mode');
                btn.textContent = 'Assembly View';
            }
        });
    }

    // ── Utilities ────────────────────────────────────────────

    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ── Init ─────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', function () {
        renderHeader();
        initAssemblyButton();
        load();
        setInterval(load, CONFIG.REFRESH_INTERVAL * 1000);
    });

}());
