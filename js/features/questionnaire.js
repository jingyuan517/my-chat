/**
 * questionnaire.js - 问卷调查
 * 两种模式：
 *   choice（选项模式）：我为每题给出选项，梦角从选项里选一个回答
 *   card（字卡模式）：梦角的回答从字卡回复库中抽取
 * 回复时间仿照信件：寄出 → 约 30–60 分钟送达 → 10–24 小时内回寄答案
 */
(function () {
    'use strict';

    var DATA_KEY = 'questionnaireData';
    var data = { items: [] };
    var viewId = null;
    var composeMode = 'choice'; // 'choice' | 'card'

    /* ---------------- 存储 ---------------- */
    async function loadData() {
        try {
            var saved = await localforage.getItem(getStorageKey(DATA_KEY));
            if (saved && typeof saved === 'object') data = saved;
            if (!Array.isArray(data.items)) data.items = [];
        } catch (e) { data = { items: [] }; }
    }
    function saveData() {
        try { return localforage.setItem(getStorageKey(DATA_KEY), data); } catch (e) { return Promise.resolve(); }
    }

    /* ---------------- 题目读取/工具 ---------------- */
    function qText(q) { return typeof q === 'string' ? q : (q && q.text) || ''; }
    function qOptions(q) { return (q && Array.isArray(q.options)) ? q.options : []; }
    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ---------------- 答案生成（纯概率，均衡随机） ---------------- */
    function answerPool() {
        var pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies)) ? customReplies.slice() : [];
        pool = pool.map(function (s) { return String(s || '').trim(); }).filter(Boolean);
        if (!pool.length) pool = ['嗯嗯，我在呢', '今天也有点想你', '好呀，都听你的', '让我想想…', '嘿嘿，你猜'];
        return pool;
    }
    // 等概率随机；若可避免，则不与上一次重复（保证均衡、不总是同一张）
    function pickBalanced(arr, avoid) {
        if (!arr.length) return '';
        var pool = arr;
        if (avoid != null && arr.length > 1) {
            var filtered = arr.filter(function (x) { return x !== avoid; });
            if (filtered.length) pool = filtered;
        }
        return pool[Math.floor(Math.random() * pool.length)];
    }
    function genCardAnswer(avoid) {
        var pool = answerPool();
        var n = Math.random() < 0.6 ? 1 : 2;
        var parts = [];
        var last = avoid;
        for (var i = 0; i < n; i++) {
            var picked = pickBalanced(pool, last);
            parts.push(picked);
            last = picked;
        }
        return parts.join('，') + '。';
    }
    function genAnswer(item, q, avoid) {
        var opts = qOptions(q).map(function (o) { return String(o || '').trim(); }).filter(Boolean);
        if (item.mode === 'choice' && opts.length) {
            return pickBalanced(opts, avoid);
        }
        return genCardAnswer(avoid);
    }

    /* ---------------- 状态检查 ---------------- */
    window.checkQuestionnaireStatus = async function () {
        if (typeof SESSION_ID === 'undefined' || !SESSION_ID) return;
        await loadData();
        var now = Date.now();
        var changed = false;
        var answeredItem = null;

        data.items.forEach(function (item) {
            if (item.status === 'sent' && item.deliveredTime && now >= item.deliveredTime) {
                item.status = 'delivered';
                changed = true;
            }
            if (item.status === 'delivered' && item.replyTime && now >= item.replyTime) {
                item.status = 'answered';
                // 答案一旦生成即固定：刷新、重复检查都不会改变
                var newlyAnswered = false;
                if (!Array.isArray(item.answers) || item.answers.length !== item.questions.length) {
                    var last = null;
                    item.answers = item.questions.map(function (q) {
                        var a = genAnswer(item, q, last);
                        last = a;
                        return a;
                    });
                    newlyAnswered = true;
                }
                if (!item.answeredTime) item.answeredTime = now;
                changed = true;
                if (newlyAnswered) answeredItem = item;
                if (typeof playSound === 'function') playSound('message');
            }
        });

        if (changed) {
            await saveData();
            var modal = document.getElementById('questionnaire-modal');
            if (modal && getComputedStyle(modal).display !== 'none') renderList();
            // 仅在“刚刚生成回复”时弹窗
            if (answeredItem) showAnsweredPopup(answeredItem);
        }
    };

    function showAnsweredPopup(item) {
        var existing = document.getElementById('qn-answered-popup');
        if (existing) existing.remove();
        var pName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
        var popup = document.createElement('div');
        popup.id = 'qn-answered-popup';
        popup.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--secondary-bg);border:1px solid var(--border-color);border-radius:20px;padding:18px 20px;z-index:8000;max-width:320px;width:88%;box-shadow:0 8px 32px rgba(0,0,0,0.18);display:flex;flex-direction:column;gap:12px;';
        popup.innerHTML =
            '<div style="display:flex;align-items:center;gap:10px;">' +
                '<span style="font-size:26px;">📋</span>' +
                '<div>' +
                    '<div style="font-size:14px;font-weight:700;color:var(--text-primary);">' + escapeHtml(pName) + ' 回寄了问卷</div>' +
                    '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;opacity:0.8;">快去看看吧~</div>' +
                '</div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;">' +
                '<button id="qn-popup-later" style="flex:1;padding:8px 0;border-radius:12px;border:1px solid var(--border-color);background:var(--primary-bg);color:var(--text-secondary);font-size:13px;cursor:pointer;">稍后查看</button>' +
                '<button id="qn-popup-read" style="flex:2;padding:8px 0;border-radius:12px;border:none;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">立即查看</button>' +
            '</div>';
        document.body.appendChild(popup);
        popup.querySelector('#qn-popup-later').onclick = function () { popup.remove(); };
        popup.querySelector('#qn-popup-read').onclick = function () {
            popup.remove();
            openModal();
            setTimeout(function () { showView(item.id); }, 120);
        };
        setTimeout(function () { if (popup.parentNode) popup.remove(); }, 8000);
    }

    /* ---------------- 视图切换 ---------------- */
    function setSection(which) {
        var list = document.getElementById('qn-list-section');
        var compose = document.getElementById('qn-compose-section');
        var view = document.getElementById('qn-view-section');
        var fList = document.getElementById('qn-footer-list');
        var fCompose = document.getElementById('qn-footer-compose');
        var fView = document.getElementById('qn-footer-view');
        if (list) list.style.display = which === 'list' ? 'block' : 'none';
        if (compose) compose.style.display = which === 'compose' ? 'block' : 'none';
        if (view) view.style.display = which === 'view' ? 'block' : 'none';
        if (fList) fList.style.display = which === 'list' ? 'flex' : 'none';
        if (fCompose) fCompose.style.display = which === 'compose' ? 'flex' : 'none';
        if (fView) fView.style.display = which === 'view' ? 'flex' : 'none';
    }

    function statusInfo(item) {
        if (item.status === 'answered') return { text: '已收到回复', color: '#3BC8A4' };
        if (item.status === 'delivered') return { text: '已送达 · 等待回复中', color: 'var(--accent-color)' };
        return { text: '已寄出', color: 'var(--text-secondary)' };
    }

    async function openModal() {
        await loadData();
        setSection('list');
        renderList();
        var modal = document.getElementById('questionnaire-modal');
        if (modal && typeof showModal === 'function') showModal(modal);
    }

    function renderList() {
        var list = document.getElementById('qn-list');
        if (!list) return;
        if (!data.items.length) {
            list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);font-size:13px;padding:36px 20px;line-height:1.8;">还没有问卷<br>点击下方「新建问卷」，写下想问的话吧~</div>';
            return;
        }
        list.innerHTML = data.items.slice().reverse().map(function (item) {
            var st = statusInfo(item);
            var when = new Date(item.sentTime).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            var firstQ = qText(item.questions[0]).slice(0, 24);
            var modeTag = item.mode === 'choice' ? '选项' : '字卡';
            return '<div class="qn-item" data-id="' + item.id + '" style="padding:12px 14px;border:1px solid var(--border-color);border-radius:12px;margin-bottom:10px;cursor:pointer;background:var(--primary-bg);">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
                        '<div style="font-size:13px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(firstQ) + (item.questions.length > 1 ? ' 等 ' + item.questions.length + ' 题' : '') + '</div>' +
                        '<span style="font-size:11px;color:' + st.color + ';flex-shrink:0;">' + st.text + '</span>' +
                    '</div>' +
                    '<div style="font-size:11px;color:var(--text-secondary);margin-top:6px;">' + modeTag + ' · 寄出 · ' + when + '</div>' +
                    '<div style="display:flex;justify-content:flex-end;margin-top:6px;">' +
                        '<button class="qn-del" data-id="' + item.id + '" style="background:none;border:none;color:#ff6b6b;font-size:12px;cursor:pointer;padding:2px 6px;">删除</button>' +
                    '</div>' +
                '</div>';
        }).join('');
    }

    /* ---------------- 编辑（新建问卷） ---------------- */
    function updateModeButtons() {
        var c = document.getElementById('qn-mode-choice');
        var k = document.getElementById('qn-mode-card');
        var hint = document.getElementById('qn-mode-hint');
        if (c) c.className = composeMode === 'choice' ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary';
        if (k) k.className = composeMode === 'card' ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary';
        if (c) { c.style.flex = '1'; c.style.fontSize = '12px'; c.style.padding = '8px'; }
        if (k) { k.style.flex = '1'; k.style.fontSize = '12px'; k.style.padding = '8px'; }
        if (hint) hint.textContent = composeMode === 'choice'
            ? '给对方几个选项，Ta 从选项里选一个回答。'
            : '只写问题，Ta 的回答从字卡回复库中抽取。';
    }

    function makeOptionRow(val, idx) {
        var d = document.createElement('div');
        d.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px;';
        d.innerHTML = '<span class="qn-opt-letter" style="font-size:11px;color:var(--text-secondary);width:16px;text-align:center;">' + String.fromCharCode(65 + idx) + '</span>' +
            '<input type="text" class="qn-opt-input" placeholder="选项内容…" style="flex:1;padding:7px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;outline:none;font-family:var(--font-family);" value="' + escapeHtml(val || '') + '">' +
            '<button class="qn-opt-remove" style="background:none;border:none;color:#ff6b6b;font-size:13px;cursor:pointer;padding:2px 6px;">✕</button>';
        d.querySelector('.qn-opt-remove').onclick = function () {
            var parent = d.parentElement;
            d.remove();
            renumberOptions(parent);
        };
        return d;
    }
    function renumberOptions(container) {
        if (!container) return;
        container.querySelectorAll('.qn-opt-letter').forEach(function (el, i) { el.textContent = String.fromCharCode(65 + i); });
    }

    function addQuestionRow(q) {
        q = q || {};
        var text = qText(q);
        var opts = qOptions(q).slice();
        if (!opts.length) opts = ['', '', ''];

        var wrap = document.getElementById('qn-questions');
        var row = document.createElement('div');
        row.className = 'qn-row';
        row.style.cssText = 'border:1px solid var(--border-color);border-radius:10px;padding:10px;margin-bottom:10px;background:var(--primary-bg);';
        row.innerHTML =
            '<div style="display:flex;align-items:center;gap:8px;">' +
                '<span class="qn-idx" style="font-size:12px;color:var(--text-secondary);width:20px;text-align:center;"></span>' +
                '<input type="text" class="modal-input qn-q-input" placeholder="写下一个问题…" style="flex:1;margin-bottom:0;" value="' + escapeHtml(text) + '">' +
                '<button class="qn-remove" style="background:none;border:none;color:#ff6b6b;font-size:15px;cursor:pointer;padding:4px 8px;">✕</button>' +
            '</div>' +
            '<div class="qn-options" style="margin-top:8px;display:' + (composeMode === 'choice' ? 'block' : 'none') + ';"></div>' +
            '<button class="qn-add-option modal-btn modal-btn-secondary" style="margin-top:6px;font-size:11px;padding:5px 10px;display:' + (composeMode === 'choice' ? 'inline-flex' : 'none') + ';">+ 添加选项</button>';

        var optWrap = row.querySelector('.qn-options');
        opts.forEach(function (o, i) { optWrap.appendChild(makeOptionRow(o, i)); });

        row.querySelector('.qn-remove').onclick = function () { row.remove(); renumber(); };
        row.querySelector('.qn-add-option').onclick = function () {
            optWrap.appendChild(makeOptionRow('', optWrap.children.length));
            renumberOptions(optWrap);
        };
        wrap.appendChild(row);
        renumber();
    }

    function renumber() {
        document.querySelectorAll('#qn-questions .qn-idx').forEach(function (el, i) { el.textContent = (i + 1) + '.'; });
    }

    function readComposeQuestions() {
        var rows = document.querySelectorAll('#qn-questions .qn-row');
        var out = [];
        rows.forEach(function (row) {
            var text = (row.querySelector('.qn-q-input') || {}).value || '';
            text = text.trim();
            if (!text) return;
            var opts = [];
            row.querySelectorAll('.qn-opt-input').forEach(function (inp) { var v = inp.value.trim(); if (v) opts.push(v); });
            out.push({ text: text, options: opts });
        });
        return out;
    }

    function showCompose() {
        composeMode = 'choice';
        updateModeButtons();
        var wrap = document.getElementById('qn-questions');
        if (wrap) wrap.innerHTML = '';
        for (var i = 0; i < 3; i++) addQuestionRow();
        setSection('compose');
    }

    function setComposeMode(mode) {
        if (composeMode === mode) return;
        var current = readComposeQuestions();
        composeMode = mode;
        updateModeButtons();
        var wrap = document.getElementById('qn-questions');
        if (wrap) wrap.innerHTML = '';
        if (!current.length) { for (var i = 0; i < 3; i++) addQuestionRow(); }
        else current.forEach(function (q) { addQuestionRow(q); });
    }

    function sendQuestionnaire() {
        var questions = readComposeQuestions();
        if (!questions.length) { if (typeof showNotification === 'function') showNotification('至少写一个问题', 'warning'); return; }
        if (composeMode === 'choice') {
            for (var i = 0; i < questions.length; i++) {
                if (questions[i].options.length < 2) {
                    if (typeof showNotification === 'function') showNotification('选项模式：第 ' + (i + 1) + ' 题至少要有 2 个选项', 'warning', 2600);
                    return;
                }
            }
        }

        var now = Date.now();
        var minHours = 10, maxHours = 24;
        var randomHours = Math.random() * (maxHours - minHours) + minHours;
        var deliveredDelay = (30 + Math.random() * 30) * 60 * 1000; // 30–60 分钟

        data.items.push({
            id: 'qn_' + now + '_' + Math.random().toString(36).substr(2, 4),
            mode: composeMode,
            questions: questions,
            sentTime: now,
            deliveredTime: now + deliveredDelay,
            replyTime: now + randomHours * 60 * 60 * 1000,
            status: 'sent',
            answers: null
        });
        saveData();
        setSection('list');
        renderList();
        if (typeof showNotification === 'function') showNotification('问卷已寄出 📋', 'success');
    }

    /* ---------------- 查看 ---------------- */
    function showView(id) {
        viewId = id;
        var item = data.items.find(function (x) { return x.id === id; });
        var box = document.getElementById('qn-view-content');
        if (!item || !box) return;
        var pName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
        var st = statusInfo(item);

        var html = '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">' +
            (item.mode === 'choice' ? '选项模式' : '字卡模式') + ' · 寄出：' +
            new Date(item.sentTime).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) +
            ' · ' + st.text + '</div>';

        if (item.status === 'answered' && Array.isArray(item.answers)) {
            item.questions.forEach(function (q, i) {
                var opts = qOptions(q);
                var answer = item.answers[i] || '';
                html += '<div style="margin-bottom:16px;">' +
                            '<div style="font-size:13px;font-weight:600;color:var(--accent-color);margin-bottom:8px;">' + (i + 1) + '. ' + escapeHtml(qText(q)) + '</div>';
                if (item.mode === 'choice' && opts.length) {
                    html += '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;">';
                    opts.forEach(function (o, oi) {
                        var chosen = String(o).trim() === String(answer).trim();
                        html += '<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:7px 10px;border-radius:8px;border:1px solid ' + (chosen ? 'var(--accent-color)' : 'var(--border-color)') + ';background:' + (chosen ? 'rgba(var(--accent-color-rgb),0.08)' : 'transparent') + ';">' +
                                    '<span style="font-weight:700;color:' + (chosen ? 'var(--accent-color)' : 'var(--text-secondary)') + ';">' + String.fromCharCode(65 + oi) + '.</span>' +
                                    '<span style="flex:1;color:var(--text-primary);">' + escapeHtml(o) + '</span>' +
                                    (chosen ? '<span style="font-size:11px;color:var(--accent-color);">Ta 的选择 ✓</span>' : '') +
                                '</div>';
                    });
                    html += '</div>';
                } else {
                    html += '<div style="font-size:13px;color:var(--text-primary);line-height:1.7;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:10px;padding:10px 12px;">' + escapeHtml(answer) + '</div>';
                }
                html += '</div>';
            });
        } else {
            html += '<div style="text-align:center;color:var(--text-secondary);font-size:13px;padding:28px 16px;line-height:1.8;">' +
                        '<div style="font-size:30px;margin-bottom:8px;">📮</div>' +
                        '问卷正在路上…<br>' +
                        (item.status === 'delivered' ? '已送达，' + escapeHtml(pName) + '正在认真填写，请稍候~' : '寄出后约 30–60 分钟送达，10–24 小时内回寄答案。') +
                    '</div>' +
                    '<div style="border-top:1px dashed var(--border-color);padding-top:12px;">' +
                        '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">你寄出的问题：</div>' +
                        item.questions.map(function (q, i) {
                            var s = '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;">' + (i + 1) + '. ' + escapeHtml(qText(q)) + '</div>';
                            var opts = qOptions(q);
                            if (item.mode === 'choice' && opts.length) {
                                s += '<div style="font-size:12px;color:var(--text-secondary);opacity:0.75;margin:-2px 0 8px 14px;">' +
                                        opts.map(function (o, oi) { return String.fromCharCode(65 + oi) + '. ' + escapeHtml(o); }).join('　') + '</div>';
                            }
                            return s;
                        }).join('') +
                    '</div>';
        }
        box.innerHTML = html;
        setSection('view');
    }

    /* ---------------- 事件绑定 ---------------- */
    window.initQuestionnaireListeners = function () {
        var entry = document.getElementById('questionnaire-function');
        if (entry && !entry._qnBound) {
            entry._qnBound = true;
            entry.addEventListener('click', function () {
                if (typeof hideModal === 'function') hideModal(document.getElementById('advanced-modal'));
                openModal();
            });
        }

        function bind(id, fn) {
            var el = document.getElementById(id);
            if (el && !el._qnBound) { el._qnBound = true; el.addEventListener('click', fn); }
        }
        bind('qn-new-btn', showCompose);
        bind('qn-add-question', function () { addQuestionRow(); });
        bind('qn-cancel-compose', function () { setSection('list'); renderList(); });
        bind('qn-send', sendQuestionnaire);
        bind('qn-close', function () { if (typeof hideModal === 'function') hideModal(document.getElementById('questionnaire-modal')); });
        bind('qn-view-back', function () { setSection('list'); renderList(); });
        bind('qn-mode-choice', function () { setComposeMode('choice'); });
        bind('qn-mode-card', function () { setComposeMode('card'); });

        var list = document.getElementById('qn-list');
        if (list && !list._qnBound) {
            list._qnBound = true;
            list.addEventListener('click', function (e) {
                var del = e.target.closest('.qn-del');
                if (del) {
                    e.stopPropagation();
                    var id = del.dataset.id;
                    if (confirm('确定删除这份问卷吗？')) {
                        data.items = data.items.filter(function (x) { return x.id !== id; });
                        saveData();
                        renderList();
                    }
                    return;
                }
                var item = e.target.closest('.qn-item');
                if (item) showView(item.dataset.id);
            });
        }
    };

    // 启动：定期检查回复状态（SESSION_ID 就绪后才会有实际效果）
    if (typeof localforage !== 'undefined') {
        setInterval(function () {
            if (typeof checkQuestionnaireStatus === 'function') checkQuestionnaireStatus();
        }, 60 * 1000);
    }
})();
