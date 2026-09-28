/**
 * mood.js - 心情手账
 * 记录心情 / 随记 / 天气，支持日历、统计、回收站、导入导出
 * 数据模型（与每日公告兼容）：
 *   moodData["YYYY-MM-DD"] = {
 *     me: <moodKey>, meNote: <string>, weather: <string>,
 *     partner: <moodKey>, partnerNote: <string>, partnerWeather: <string>
 *   }
 */
(function () {
    'use strict';

    var DATA_KEY = 'moodData_v1';
    var TRASH_KEY = 'moodTrash_v1';
    var CUSTOM_KEY = 'customMoodOptions_v1';

    var DEFAULT_MOODS = [
        { key: 'happy',    kaomoji: '😊', label: '开心', color: '#FFD93D' },
        { key: 'calm',     kaomoji: '😌', label: '平静', color: '#A8D8EA' },
        { key: 'love',     kaomoji: '🥰', label: '心动', color: '#F4A6B3' },
        { key: 'excited',  kaomoji: '🤩', label: '兴奋', color: '#FFB347' },
        { key: 'thinking', kaomoji: '🤔', label: '思考', color: '#C5A47E' },
        { key: 'tired',    kaomoji: '😪', label: '疲惫', color: '#B8B8C0' },
        { key: 'sad',      kaomoji: '😢', label: '难过', color: '#7FA6CD' },
        { key: 'anxious',  kaomoji: '😰', label: '焦虑', color: '#BB9EC7' },
        { key: 'angry',    kaomoji: '😠', label: '生气', color: '#FF9A8B' },
        { key: 'sick',     kaomoji: '🤒', label: '不适', color: '#9DBFA0' },
        { key: 'blank',    kaomoji: '😶', label: '放空', color: '#CFCFCF' },
        { key: 'touched',  kaomoji: '🥹', label: '感动', color: '#E0A96D' }
    ];

    var data = {};          // 心情数据
    var trash = [];         // 回收站
    var customMoods = [];   // 自定义心情

    var viewMonth = new Date();
    var editDate = null;        // 正在编辑的日期
    var editTarget = 'me';      // 'me' | 'partner'
    var selectedMoodKey = null; // 编辑器中选中的心情
    var detailDate = null;

    // 供 inline onclick 使用
    window.selectedDateStr = null;

    /* ---------------- 存储 ---------------- */
    function safeParse(raw, fallback) {
        try { var v = JSON.parse(raw); return v == null ? fallback : v; } catch (e) { return fallback; }
    }
    function load() {
        data = safeParse(localStorage.getItem(DATA_KEY), {});
        if (typeof data !== 'object' || Array.isArray(data)) data = {};
        trash = safeParse(localStorage.getItem(TRASH_KEY), []);
        if (!Array.isArray(trash)) trash = [];
        customMoods = safeParse(localStorage.getItem(CUSTOM_KEY), []);
        if (!Array.isArray(customMoods)) customMoods = [];
        window.moodData = data;
    }
    function persist() {
        try { localStorage.setItem(DATA_KEY, JSON.stringify(data)); } catch (e) { console.warn('心情数据保存失败', e); }
        window.moodData = data;
    }
    function persistTrash() {
        try { localStorage.setItem(TRASH_KEY, JSON.stringify(trash)); } catch (e) {}
    }
    function persistCustom() {
        try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(customMoods)); } catch (e) {}
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function todayKey() { return dateKey(new Date()); }

    function allOptions() {
        return DEFAULT_MOODS.concat(customMoods);
    }
    function findMood(key) {
        var list = allOptions();
        for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
        return null;
    }
    window.getAllMoodOptions = function () { return allOptions(); };

    /* ---------------- 心情手账主弹窗 ---------------- */
    function openMoodModal() {
        load();
        viewMonth = new Date();
        showView('calendar');
        renderCalendar();
        var modal = document.getElementById('mood-modal');
        if (modal && typeof showModal === 'function') showModal(modal);
    }

    function showView(view) {
        var map = {
            calendar: ['mood-calendar-view', 'btn-view-calendar'],
            stats: ['mood-stats-view', 'btn-view-stats'],
            trash: ['mood-trash-view', 'btn-view-trash']
        };
        Object.keys(map).forEach(function (v) {
            var section = document.getElementById(map[v][0]);
            var btn = document.getElementById(map[v][1]);
            var on = v === view;
            if (section) section.classList.toggle('hidden-view', !on);
            if (btn) btn.classList.toggle('active', on);
        });
        if (view === 'stats') renderStats();
        if (view === 'trash') renderTrash();
    }

    /* ---------------- 日历 ---------------- */
    function renderCalendar() {
        var grid = document.getElementById('calendar-grid');
        var label = document.getElementById('calendar-month-label');
        if (!grid) return;
        if (label) label.textContent = viewMonth.getFullYear() + ' 年 ' + (viewMonth.getMonth() + 1) + ' 月';

        var year = viewMonth.getFullYear();
        var month = viewMonth.getMonth();
        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var tKey = todayKey();

        var html = '';
        for (var i = 0; i < firstDay; i++) html += '<div class="calendar-day empty"></div>';
        for (var d = 1; d <= daysInMonth; d++) {
            var key = year + '-' + pad(month + 1) + '-' + pad(d);
            var entry = data[key] || {};
            var dots = '';
            var meMood = findMood(entry.me);
            var pMood = findMood(entry.partner);
            if (meMood) dots += '<span class="mood-marker me" title="我">' + meMood.kaomoji + '</span>';
            if (pMood) dots += '<span class="mood-marker partner" title="梦角">' + pMood.kaomoji + '</span>';
            html += '<div class="calendar-day' + (key === tKey ? ' today' : '') + '" data-date="' + key + '">' +
                        '<span>' + d + '</span>' +
                        (dots ? '<div class="mood-dots">' + dots + '</div>' : '') +
                    '</div>';
        }
        grid.innerHTML = html;
    }

    /* ---------------- 编辑弹层 ---------------- */
    function openMoodEditor(dateStr, target) {
        editDate = dateStr;
        editTarget = target || 'me';
        window.selectedDateStr = dateStr;
        var entry = data[dateStr] || {};
        selectedMoodKey = entry[editTarget] || null;

        var d = new Date(dateStr + 'T00:00:00');
        var dateEl = document.getElementById('mood-selector-date');
        if (dateEl) dateEl.textContent = (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';

        setTargetTabs();
        renderOptions();
        var noteEl = document.getElementById('mood-note-input');
        if (noteEl) noteEl.value = entry[editTarget + 'Note'] || '';
        var weatherEl = document.getElementById('mood-weather-input');
        if (weatherEl) weatherEl.value = entry[editTarget === 'me' ? 'weather' : 'partnerWeather'] || '';
        var noteLabel = document.getElementById('mood-note-label');
        if (noteLabel) noteLabel.textContent = editTarget === 'partner' ? '梦角的随记:' : '随记:';
        var weatherLabel = document.getElementById('mood-weather-label');
        if (weatherLabel) weatherLabel.style.display = editTarget === 'me' ? 'flex' : 'none';
        if (weatherEl) weatherEl.style.display = editTarget === 'me' ? '' : 'none';

        var overlay = document.getElementById('mood-selector-overlay');
        var editor = document.getElementById('mood-editor-view');
        var detail = document.getElementById('mood-detail-view');
        if (editor) editor.style.display = '';
        if (detail) detail.style.display = 'none';
        if (overlay) overlay.classList.add('active');
    }

    function setTargetTabs() {
        var me = document.getElementById('mood-tab-me');
        var ptr = document.getElementById('mood-tab-partner');
        if (me) me.classList.toggle('active', editTarget === 'me');
        if (ptr) ptr.classList.toggle('active', editTarget === 'partner');
    }

    function renderOptions() {
        var grid = document.getElementById('mood-options-grid');
        if (!grid) return;
        var list = allOptions();
        grid.innerHTML = list.map(function (m) {
            var isCustom = customMoods.some(function (c) { return c.key === m.key; });
            var sel = m.key === selectedMoodKey;
            return '<div class="mood-option-btn' + (isCustom ? ' mood-option-custom' : '') + '" data-key="' + m.key + '"' +
                    ' style="' + (sel ? 'border-color:' + m.color + ';box-shadow:0 0 0 2px ' + m.color + '55;' : '') + '">' +
                    '<span class="mood-kaomoji">' + m.kaomoji + '</span>' +
                    '<span class="mood-label">' + m.label + '</span>' +
                    (isCustom ? '<div class="mood-custom-actions"><button class="mood-custom-action-btn" data-del="' + m.key + '" title="删除">✕</button></div>' : '') +
                '</div>';
        }).join('');
    }

    function chooseMood(key) {
        selectedMoodKey = key;
        renderOptions();
    }

    function saveMoodFromEditor() {
        if (!editDate) return;
        if (!data[editDate]) data[editDate] = {};
        var entry = data[editDate];
        var noteEl = document.getElementById('mood-note-input');
        var weatherEl = document.getElementById('mood-weather-input');
        var note = noteEl ? noteEl.value.trim() : '';
        var weather = weatherEl ? weatherEl.value.trim() : '';

        if (selectedMoodKey) entry[editTarget] = selectedMoodKey;
        else delete entry[editTarget];
        entry[editTarget + 'Note'] = note;
        if (editTarget === 'me') entry.weather = weather;
        else entry.partnerWeather = weather;

        // 清理空记录
        var hasMe = !!entry.me, hasPtr = !!entry.partner;
        var hasNote = (entry.meNote || '') || (entry.partnerNote || '') || (entry.weather || '') || (entry.partnerWeather || '');
        if (!hasMe && !hasPtr && !hasNote) delete data[editDate];

        persist();
        renderCalendar();
        closeMoodOverlay();
        if (typeof showNotification === 'function') showNotification('已保存', 'success', 1500);
    }

    function openMoodDetail(dateStr) {
        detailDate = dateStr;
        window.selectedDateStr = dateStr;
        var entry = data[dateStr] || {};
        var d = new Date(dateStr + 'T00:00:00');
        var dateEl = document.getElementById('detail-date');
        if (dateEl) dateEl.textContent = d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';

        var meMood = findMood(entry.me);
        var pMood = findMood(entry.partner);
        var pName = (typeof settings !== 'undefined' && settings.partnerName) || '梦角';

        function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v || ''; }
        setText('detail-kaomoji', meMood ? meMood.kaomoji : '');
        setText('detail-label', meMood ? meMood.label : '未记录');
        setText('detail-text', entry.meNote || '');
        var myWeatherEl = document.getElementById('detail-my-weather');
        if (myWeatherEl) { myWeatherEl.style.display = entry.weather ? '' : 'none'; }
        setText('detail-my-weather-val', entry.weather || '');

        setText('detail-partner-kaomoji', pMood ? pMood.kaomoji : '');
        setText('detail-partner-label', pMood ? pMood.label : '未记录');
        setText('detail-partner-text', entry.partnerNote || '');
        var pWeatherEl = document.getElementById('detail-partner-weather');
        if (pWeatherEl) { pWeatherEl.style.display = entry.partnerWeather ? '' : 'none'; }
        setText('detail-partner-weather-val', entry.partnerWeather || '');
        var pTitle = document.getElementById('detail-partner-title');
        if (pTitle) pTitle.textContent = pName + '的';

        var noRec = document.getElementById('detail-partner-no-record');
        if (noRec) noRec.style.display = pMood ? 'none' : 'block';

        var editor = document.getElementById('mood-editor-view');
        var detail = document.getElementById('mood-detail-view');
        if (editor) editor.style.display = 'none';
        if (detail) detail.style.display = '';
    }

    function deleteMood(dateStr, target) {
        if (!dateStr || !data[dateStr]) return;
        var entry = data[dateStr];
        if (!entry[target]) {
            if (typeof showNotification === 'function') showNotification('这天没有记录', 'info', 1500);
            return;
        }
        var who = target === 'me' ? '我' : ((typeof settings !== 'undefined' && settings.partnerName) || '梦角');
        if (!confirm('确定删除这天「' + who + '」的心情记录吗？')) return;
        trash.unshift({
            date: dateStr,
            target: target,
            mood: entry[target],
            note: entry[target + 'Note'] || '',
            weather: entry[target === 'me' ? 'weather' : 'partnerWeather'] || '',
            deletedAt: Date.now()
        });
        delete entry[target];
        delete entry[target + 'Note'];
        if (target === 'me') delete entry.weather; else delete entry.partnerWeather;
        if (!entry.me && !entry.partner) delete data[dateStr];
        persist();
        persistTrash();
        renderCalendar();
        openMoodDetail(dateStr);
        if (typeof showNotification === 'function') showNotification('已移入回收站', 'success', 1500);
    }

    function closeOverlay() {
        var overlay = document.getElementById('mood-selector-overlay');
        if (overlay) overlay.classList.remove('active');
        var custom = document.getElementById('custom-mood-dialog');
        if (custom) custom.style.display = 'none';
    }

    /* ---------------- 自定义心情 ---------------- */
    var CUSTOM_COLORS = ['#FFD93D', '#F4A6B3', '#A8D8EA', '#7BC8A4', '#BB9EC7', '#FF9A8B', '#C5A47E', '#7FA6CD'];
    var pickedColor = CUSTOM_COLORS[0];

    function openCustomMoodDialog() {
        var wrap = document.getElementById('custom-mood-dialog');
        var emoji = document.getElementById('custom-mood-emoji');
        var label = document.getElementById('custom-mood-label');
        var colors = document.getElementById('custom-mood-colors');
        if (emoji) emoji.value = '';
        if (label) label.value = '';
        pickedColor = CUSTOM_COLORS[0];
        if (colors) {
            colors.innerHTML = CUSTOM_COLORS.map(function (c, i) {
                return '<div class="custom-mood-color-dot' + (i === 0 ? ' selected' : '') + '" data-color="' + c + '" style="width:22px;height:22px;border-radius:50%;background:' + c + ';cursor:pointer;"></div>';
            }).join('');
        }
        if (wrap) wrap.style.display = 'block';
    }

    function closeCustomMoodDialog() {
        var wrap = document.getElementById('custom-mood-dialog');
        if (wrap) wrap.style.display = 'none';
    }

    function saveCustomMood() {
        var emoji = (document.getElementById('custom-mood-emoji') || {}).value || '';
        var label = (document.getElementById('custom-mood-label') || {}).value || '';
        emoji = emoji.trim();
        label = label.trim();
        if (!emoji || !label) { if (typeof showNotification === 'function') showNotification('请填写表情和名称', 'warning'); return; }
        customMoods.push({ key: 'custom_' + Date.now(), kaomoji: emoji, label: label, color: pickedColor, custom: true });
        persistCustom();
        selectedMoodKey = customMoods[customMoods.length - 1].key;
        renderOptions();
        closeCustomMoodDialog();
    }

    /* ---------------- 统计 ---------------- */
    function renderStats() {
        var box = document.getElementById('mood-stats-container');
        if (!box) return;
        var meCount = {}, ptrCount = {}, totalDays = 0, meDays = 0, ptrDays = 0;
        Object.keys(data).forEach(function (k) {
            var e = data[k];
            var any = false;
            if (e.me) { meCount[e.me] = (meCount[e.me] || 0) + 1; meDays++; any = true; }
            if (e.partner) { ptrCount[e.partner] = (ptrCount[e.partner] || 0) + 1; ptrDays++; any = true; }
            if (any) totalDays++;
        });

        var pName = (typeof settings !== 'undefined' && settings.partnerName) || '梦角';
        var mName = (typeof settings !== 'undefined' && settings.myName) || '我';

        function bars(counts) {
            var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
            if (!keys.length) return '<div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:14px;">暂无数据</div>';
            var max = counts[keys[0]];
            return keys.map(function (k) {
                var m = findMood(k) || { kaomoji: '❔', label: k, color: 'var(--accent-color)' };
                var pct = Math.round(counts[k] / max * 100);
                return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;text-align:left;">' +
                        '<span style="width:56px;font-size:12px;">' + m.kaomoji + ' ' + m.label + '</span>' +
                        '<div style="flex:1;height:8px;background:var(--border-color);border-radius:4px;overflow:hidden;">' +
                            '<div class="mood-stats-bar" style="width:' + pct + '%;height:100%;background:' + (m.color || 'var(--accent-color)') + ';"></div>' +
                        '</div>' +
                        '<span style="width:28px;text-align:right;font-size:12px;color:var(--text-secondary);">' + counts[k] + '</span>' +
                    '</div>';
            }).join('');
        }

        box.innerHTML =
            '<div style="display:flex;gap:10px;margin-bottom:14px;">' +
                '<div style="flex:1;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:12px;padding:12px;text-align:center;">' +
                    '<div style="font-size:20px;font-weight:700;color:var(--accent-color);">' + meDays + '</div>' +
                    '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + mName + '记录天数</div>' +
                '</div>' +
                '<div style="flex:1;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:12px;padding:12px;text-align:center;">' +
                    '<div style="font-size:20px;font-weight:700;color:var(--accent-color);">' + ptrDays + '</div>' +
                    '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + pName + '记录天数</div>' +
                '</div>' +
                '<div style="flex:1;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:12px;padding:12px;text-align:center;">' +
                    '<div style="font-size:20px;font-weight:700;color:var(--accent-color);">' + totalDays + '</div>' +
                    '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">共记录天数</div>' +
                '</div>' +
            '</div>' +
            '<div style="font-size:13px;font-weight:600;margin:6px 0 10px;">' + mName + '的心情分布</div>' + bars(meCount) +
            '<div style="font-size:13px;font-weight:600;margin:16px 0 10px;">' + pName + '的心情分布</div>' + bars(ptrCount);
    }

    /* ---------------- 回收站 ---------------- */
    function renderTrash() {
        var list = document.getElementById('mood-trash-list');
        if (!list) return;
        if (!trash.length) {
            list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);font-size:13px;padding:30px;">回收站为空</div>';
            return;
        }
        list.innerHTML = trash.map(function (t, i) {
            var m = findMood(t.mood) || { kaomoji: '❔', label: t.mood || '—' };
            var who = t.target === 'me' ? '我' : '梦角';
            return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:10px;margin-bottom:8px;">' +
                    '<span style="font-size:20px;">' + m.kaomoji + '</span>' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div style="font-size:13px;font-weight:600;">' + t.date + ' · ' + who + ' · ' + m.label + '</div>' +
                        (t.note ? '<div style="font-size:12px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(t.note) + '</div>' : '') +
                    '</div>' +
                    '<button class="modal-btn modal-btn-secondary" data-restore="' + i + '" style="font-size:12px;padding:5px 10px;">恢复</button>' +
                '</div>';
        }).join('') +
        '<div style="text-align:center;margin-top:8px;"><button class="modal-btn modal-btn-secondary" id="mood-trash-clear" style="font-size:12px;padding:6px 14px;color:#ff6b6b;">清空回收站</button></div>';
    }

    function restoreTrashEntry(index) {
        var t = trash[index];
        if (!t) return;
        if (!data[t.date]) data[t.date] = {};
        data[t.date][t.target] = t.mood;
        data[t.date][t.target + 'Note'] = t.note;
        if (t.target === 'me') data[t.date].weather = t.weather; else data[t.date].partnerWeather = t.weather;
        trash.splice(index, 1);
        persist();
        persistTrash();
        renderTrash();
        if (typeof showNotification === 'function') showNotification('已恢复', 'success', 1500);
    }

    /* ---------------- 导入导出 ---------------- */
    function exportMood() {
        var payload = { version: 1, app: 'mood', exportedAt: new Date().toISOString(), data: data, customMoods: customMoods, trash: trash };
        var str = JSON.stringify(payload, null, 2);
        var blob = new Blob([str], { type: 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'mood-journal-' + todayKey() + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        if (typeof showNotification === 'function') showNotification('心情手账已导出', 'success', 2000);
    }

    function importMoodFile(file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var obj = JSON.parse(e.target.result);
                var newData = obj && (obj.data || obj.moodData || (obj.me || obj.partner ? obj : null));
                if (!newData || typeof newData !== 'object') throw new Error('格式不正确');
                var count = Object.keys(newData).length;
                if (!confirm('检测到 ' + count + ' 天的记录，导入将覆盖当前心情手账，确定继续吗？')) return;
                data = newData;
                if (Array.isArray(obj.customMoods)) { customMoods = obj.customMoods; persistCustom(); }
                if (Array.isArray(obj.trash)) { trash = obj.trash; persistTrash(); }
                persist();
                renderCalendar();
                renderStats();
                if (typeof showNotification === 'function') showNotification('导入成功', 'success', 2000);
            } catch (err) {
                console.warn(err);
                if (typeof showNotification === 'function') showNotification('导入失败：文件格式不正确', 'error', 2500);
            }
        };
        reader.readAsText(file);
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ---------------- 事件绑定 ---------------- */
    window.initMoodData = async function () {
        load();
    };

    window.initMoodListeners = function () {
        var entry = document.getElementById('mood-function');
        if (entry && !entry._moodBound) {
            entry._moodBound = true;
            entry.addEventListener('click', function () {
                if (typeof hideModal === 'function') hideModal(document.getElementById('advanced-modal'));
                openMoodModal();
            });
        }

        var closeBtn = document.getElementById('close-mood');
        if (closeBtn && !closeBtn._moodBound) {
            closeBtn._moodBound = true;
            closeBtn.addEventListener('click', function () {
                if (typeof hideModal === 'function') hideModal(document.getElementById('mood-modal'));
            });
        }

        var prev = document.getElementById('prev-month');
        if (prev && !prev._moodBound) {
            prev._moodBound = true;
            prev.addEventListener('click', function () { viewMonth.setMonth(viewMonth.getMonth() - 1); renderCalendar(); });
        }
        var next = document.getElementById('next-month');
        if (next && !next._moodBound) {
            next._moodBound = true;
            next.addEventListener('click', function () { viewMonth.setMonth(viewMonth.getMonth() + 1); renderCalendar(); });
        }

        ['calendar', 'stats', 'trash'].forEach(function (v) {
            var btn = document.getElementById('btn-view-' + v);
            if (btn && !btn._moodBound) {
                btn._moodBound = true;
                btn.addEventListener('click', function () { showView(v); });
            }
        });

        var grid = document.getElementById('calendar-grid');
        if (grid && !grid._moodBound) {
            grid._moodBound = true;
            grid.addEventListener('click', function (e) {
                var cell = e.target.closest('.calendar-day');
                if (!cell || cell.classList.contains('empty') || !cell.dataset.date) return;
                openMoodEditor(cell.dataset.date, 'me');
            });
        }

        var optGrid = document.getElementById('mood-options-grid');
        if (optGrid && !optGrid._moodBound) {
            optGrid._moodBound = true;
            optGrid.addEventListener('click', function (e) {
                var delBtn = e.target.closest('[data-del]');
                if (delBtn) {
                    var dk = delBtn.dataset.del;
                    customMoods = customMoods.filter(function (m) { return m.key !== dk; });
                    persistCustom();
                    if (selectedMoodKey === dk) selectedMoodKey = null;
                    renderOptions();
                    return;
                }
                var btn = e.target.closest('.mood-option-btn');
                if (btn) chooseMood(btn.dataset.key);
            });
        }

        var colors = document.getElementById('custom-mood-colors');
        if (colors && !colors._moodBound) {
            colors._moodBound = true;
            colors.addEventListener('click', function (e) {
                var dot = e.target.closest('.custom-mood-color-dot');
                if (!dot) return;
                pickedColor = dot.dataset.color;
                colors.querySelectorAll('.custom-mood-color-dot').forEach(function (d) { d.classList.remove('selected'); });
                dot.classList.add('selected');
            });
        }

        function bind(id, fn) {
            var el = document.getElementById(id);
            if (el && !el._moodBound) { el._moodBound = true; el.addEventListener('click', fn); }
        }
        bind('confirm-mood-save', saveMoodFromEditor);
        bind('cancel-mood-edit', closeOverlay);
        bind('view-mood-detail-btn', function () { if (editDate) openMoodDetail(editDate); });
        bind('edit-existing-mood', function () { if (editDate) openMoodEditor(editDate, 'me'); });
        bind('mood-export-btn', exportMood);
        bind('mood-import-btn', function () {
            var inp = document.getElementById('mood-import-file-input');
            if (inp) inp.click();
        });

        var importInput = document.getElementById('mood-import-file-input');
        if (importInput && !importInput._moodBound) {
            importInput._moodBound = true;
            importInput.addEventListener('change', function (e) {
                if (e.target.files[0]) importMoodFile(e.target.files[0]);
                e.target.value = '';
            });
        }

        var trashList = document.getElementById('mood-trash-list');
        if (trashList && !trashList._moodBound) {
            trashList._moodBound = true;
            trashList.addEventListener('click', function (e) {
                var restore = e.target.closest('[data-restore]');
                if (restore) { restoreTrashEntry(parseInt(restore.dataset.restore, 10)); return; }
                if (e.target.id === 'mood-trash-clear') {
                    if (confirm('确定清空回收站吗？此操作不可恢复')) {
                        trash = [];
                        persistTrash();
                        renderTrash();
                    }
                }
            });
        }
    };

    window.switchMoodEditTarget = function (target) {
        editTarget = target === 'partner' ? 'partner' : 'me';
        if (!editDate) editDate = todayKey();
        window.selectedDateStr = editDate;
        var entry = data[editDate] || {};
        selectedMoodKey = entry[editTarget] || null;
        setTargetTabs();
        renderOptions();
        var noteEl = document.getElementById('mood-note-input');
        if (noteEl) noteEl.value = entry[editTarget + 'Note'] || '';
        var weatherEl = document.getElementById('mood-weather-input');
        if (weatherEl) {
            weatherEl.value = entry[editTarget === 'me' ? 'weather' : 'partnerWeather'] || '';
            weatherEl.style.display = editTarget === 'me' ? '' : 'none';
        }
        var weatherLabel = document.getElementById('mood-weather-label');
        if (weatherLabel) weatherLabel.style.display = editTarget === 'me' ? 'flex' : 'none';
        var noteLabel = document.getElementById('mood-note-label');
        if (noteLabel) noteLabel.textContent = editTarget === 'partner' ? '梦角的随记:' : '随记:';
    };

    window.openCustomMoodDialog = openCustomMoodDialog;
    window.closeCustomMoodDialog = closeCustomMoodDialog;
    window.saveCustomMood = saveCustomMood;
    window.viewMoodDetailFromEditor = function () { if (editDate) openMoodDetail(editDate); };
    window.closeMoodOverlay = closeOverlay;
    window.deleteDailyMood = deleteMood;
    window.editPartnerMoodRecord = function () { if (editDate) openMoodEditor(editDate, 'partner'); };

    // 预加载，保证每日公告能读到数据
    load();
})();
