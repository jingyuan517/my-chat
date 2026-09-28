function renderStatsContent() {
            const statsContent = DOMElements.statsModal.content;

            const partnerMessages = messages.filter(msg =>
                msg.sender !== 'user' && msg.sender !== null &&
                msg.text &&
                msg.type !== 'system'
            );
            
            const myMessages = messages.filter(msg =>
                msg.sender === 'user' &&
                msg.text &&
                msg.type !== 'system'
            );

            if (partnerMessages.length === 0 && myMessages.length === 0) {
                statsContent.innerHTML = `
                    <div class="stats-empty-state">
                        <div class="stats-empty-icon"><i class="fas fa-chart-pie"></i></div>
                        <h3>暂无数据</h3>
                        <p>多聊几句再来看看吧...</p>
                    </div>`;
                return;
            }

            const getTopReplies = (msgs) => {
                const countMap = {};
                msgs.forEach(msg => {
                    const text = msg.text.trim();
                    if (text) {
                        countMap[text] = (countMap[text] || 0) + 1;
                    }
                });
                return Object.entries(countMap)
                    .map(([text, count]) => ({ text, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5); 
            };

            const partnerTop = getTopReplies(partnerMessages);
            const myTop = getTopReplies(myMessages);

            const generateRankHTML = (list) => {
                if (list.length === 0) return '<div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:10px;">暂无数据</div>';
                const maxVal = list[0].count;
                return list.map((item, index) => {
                    const percent = (item.count / maxVal) * 100;
                    return `
                    <div class="rank-item">
                        <div class="rank-progress-bg" style="width: ${percent}%; opacity: 0.1; background-color: var(--text-primary);"></div>
                        <div class="rank-info">
                            <div class="rank-number">#${index + 1}</div>
                            <div class="rank-text" title="${item.text}">${item.text}</div>
                            <div class="rank-count">${item.count}次</div>
                        </div>
                    </div>`;
                }).join('');
            };

            const allMsgs = messages.filter(m => m.timestamp);
            const firstMsg = allMsgs.length > 0 ? allMsgs[0] : { timestamp: new Date() };
            const lastMsg = allMsgs.length > 0 ? allMsgs[allMsgs.length - 1] : { timestamp: new Date() };

            const formatDate = (dateObj) => {
                return new Date(dateObj).toLocaleDateString('zh-CN', {
                    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                });
            };

            statsContent.innerHTML = `
                <div class="stats-dashboard">
                    <div class="stats-overview-grid">
                        <div class="overview-item overview-large">
                            <div class="overview-value">${messages.length}</div>
                            <div class="overview-label">总消息数</div>
                        </div>
                        <div class="overview-row-two">
                            <div class="overview-item">
                                <div class="overview-value">${myMessages.length}</div>
                                <div class="overview-label">我发送的</div>
                            </div>
                            <div class="overview-item">
                                <div class="overview-value">${partnerMessages.length}</div>
                                <div class="overview-label">对方发送的</div>
                            </div>
                        </div>
                        <div class="overview-row-dates">
                            <div class="overview-item overview-date">
                                <div class="overview-date-icon"><i class="fas fa-seedling"></i></div>
                                <div>
                                    <div class="overview-date-label">初次相遇</div>
                                    <div class="overview-date-value">${formatDate(firstMsg.timestamp)}</div>
                                </div>
                            </div>
                            <div class="overview-item overview-date">
                                <div class="overview-date-icon"><i class="fas fa-heart"></i></div>
                                <div>
                                    <div class="overview-date-label">最近联络</div>
                                    <div class="overview-date-value">${formatDate(lastMsg.timestamp)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="stats-card">
                        <div style="display:flex; gap:8px; margin-bottom:12px;">
                            <button id="stats-toggle-partner" class="stats-toggle-btn active" onclick="switchStatsView('partner')">
                                <i class="fas fa-user-circle"></i> 对方
                            </button>
                            <button id="stats-toggle-me" class="stats-toggle-btn" onclick="switchStatsView('me')">
                                <i class="fas fa-user"></i> 我方
                            </button>
                        </div>
                        <div class="stats-card-title" id="stats-rank-title">
                            <i class="fas fa-user-circle"></i> 对方高频词 TOP 5
                        </div>
                        <div class="stats-rank-list" id="stats-rank-list">
                            ${generateRankHTML(partnerTop)}
                        </div>
                    </div>
                </div>
            `;

            statsContent._partnerHTML = generateRankHTML(partnerTop);
            statsContent._myHTML = generateRankHTML(myTop);
        }

        window.switchStatsView = function(who) {
            const statsContent = DOMElements.statsModal.content;
            const partnerBtn = document.getElementById('stats-toggle-partner');
            const meBtn = document.getElementById('stats-toggle-me');
            const title = document.getElementById('stats-rank-title');
            const list = document.getElementById('stats-rank-list');
            if (!partnerBtn || !meBtn || !list) return;

            if (who === 'partner') {
                partnerBtn.classList.add('active');
                meBtn.classList.remove('active');
                title.innerHTML = '<i class="fas fa-user-circle"></i> 对方高频词 TOP 5';
                list.innerHTML = statsContent._partnerHTML || '<div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:10px;">暂无数据</div>';
            } else {
                meBtn.classList.add('active');
                partnerBtn.classList.remove('active');
                title.innerHTML = '<i class="fas fa-user"></i> 我方高频词 TOP 5';
                list.innerHTML = statsContent._myHTML || '<div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:10px;">暂无数据</div>';
            }
        };
        function renderSessionList() {
            const listContainer = DOMElements.sessionModal.list;
            if (sessionList.length === 0) {
                listContainer.innerHTML = '<div class="stats-empty" style="padding: 20px 0;"><p>还没有会话</p></div>';
                return;
            }
            listContainer.innerHTML = sessionList.map(session => `
            <div class="session-item ${session.id === SESSION_ID ? 'active': ''}" data-id="${session.id}">
            <div class="session-info">
            <div class="session-name">${session.name}</div>
            <div class="session-meta">创建于 ${new Date(session.createdAt).toLocaleDateString()}</div>
            </div>
            <div class="session-actions">
            <button class="session-action-btn rename" title="重命名"><i class="fas fa-pen"></i></button>
            <button class="session-action-btn delete" title="删除"><i class="fas fa-trash"></i></button>
            </div>
            </div>
            `).join('');
        }



function renderFavorites() {
    const list = document.getElementById('favorites-list');
    if (!list) return;

    const favoritedMessages = (typeof messages !== 'undefined' ? messages : [])
        .filter(m => m.favorited && m.type !== 'system');

    if (favoritedMessages.length === 0) {
        list.innerHTML = `
            <div class="stats-empty-state">
                <div class="stats-empty-icon"><i class="fas fa-star"></i></div>
                <h3>收藏夹空空如也</h3>
                <p>点击消息旁的 ☆ 星标即可收藏</p>
            </div>`;
        return;
    }

    list.innerHTML = favoritedMessages.map(msg => {
        const isUser = msg.sender === 'user';
        const senderName = isUser
            ? ((typeof settings !== 'undefined' && settings.myName) || '我')
            : ((typeof settings !== 'undefined' && settings.partnerName) || msg.sender || '对方');
        const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN', {
            month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        }) : '';
        const content = msg.text
            ? msg.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
            : msg.image
                ? `<img src="${msg.image}" style="max-width:100%;max-height:180px;border-radius:8px;display:block;margin-top:4px;cursor:pointer;" onclick="if(typeof viewImage==='function')viewImage('${msg.image.replace(/'/g,'\\\'')}')" loading="lazy">`
                : msg.voice
                    ? `<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:rgba(var(--accent-color-rgb),0.1);border-radius:20px;"><svg viewBox="0 0 22 22" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent-color);flex-shrink:0;"><circle cx="6" cy="11" r="1.3" fill="currentColor" stroke="none"/><path d="M10 8 A 3.5 3.5 0 0 1 10 14"/><path d="M13 5 A 7 7 0 0 1 13 17"/></svg><span style="font-size:12px;color:var(--accent-color);">${msg.voice.duration || 0}"</span></div>${msg.voice.fakeText ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${msg.voice.fakeText.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : ''}`
                    : '';
        const avatarEl = isUser
            ? (typeof DOMElements !== 'undefined' ? DOMElements.me.avatar : null)
            : (typeof DOMElements !== 'undefined' ? DOMElements.partner.avatar : null);
        const avatarImg = avatarEl ? avatarEl.querySelector('img') : null;
        const avatarHtml = avatarImg
            ? `<img src="${avatarImg.src}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:28px;height:28px;border-radius:50%;background:rgba(var(--accent-color-rgb),0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-user" style="font-size:11px;color:var(--accent-color);"></i></div>`;
        return `
            <div class="fav-item" style="
                display:flex;flex-direction:column;gap:4px;
                padding:12px 14px;border-radius:12px;
                background:var(--primary-bg);
                border:1px solid var(--border-color);
                margin-bottom:10px;
                position:relative;
            ">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    ${avatarHtml}
                    <span style="font-size:12px;font-weight:600;color:var(--accent-color);">${senderName}</span>
                    <span style="font-size:11px;color:var(--text-secondary);margin-left:auto;padding-right:24px;">${ts}</span>
                </div>
                <div style="font-size:13px;color:var(--text-primary);line-height:1.5;word-break:break-word;">${content}</div>
                <button class="fav-remove-btn" data-id="${msg.id}" style="
                    position:absolute;top:8px;right:10px;
                    background:none;border:none;cursor:pointer;
                    color:var(--text-secondary);font-size:14px;padding:2px 4px;
                    opacity:0.6;
                " title="取消收藏"><i class="fas fa-star" style="color:var(--accent-color);"></i></button>
            </div>`;
    }).join('');

    list.querySelectorAll('.fav-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = Number(btn.dataset.id);
            const msg = (typeof messages !== 'undefined' ? messages : []).find(m => m.id === id);
            if (msg) {
                msg.favorited = false;
                if (typeof throttledSaveData === 'function') throttledSaveData();
                if (typeof showNotification === 'function') showNotification('已取消收藏', 'success', 1500);
                // 同步更新聊天里对应消息的星星按钮状态
                const chatWrapper = document.querySelector(`.message-wrapper[data-msg-id="${id}"], .message-wrapper[data-id="${id}"]`);
                if (chatWrapper) {
                    const favBtn = chatWrapper.querySelector('.favorite-action-btn');
                    if (favBtn) {
                        favBtn.classList.remove('favorited');
                        favBtn.title = '收藏';
                        const icon = favBtn.querySelector('i');
                        if (icon) { icon.className = 'far fa-star'; }
                    }
                }
                renderFavorites();
            }
        });
    });
}
window.renderFavorites = renderFavorites;

window._runMsgSearch = function() {
    const input = document.getElementById('msg-search-input');
    const dateFrom = document.getElementById('msg-search-date-from');
    const dateTo = document.getElementById('msg-search-date-to');
    const resultsEl = document.getElementById('msg-search-results');
    if (!resultsEl) return;

    const q = (input ? input.value.trim() : '').toLowerCase();
    const from = dateFrom && dateFrom.value ? new Date(dateFrom.value) : null;
    const to = dateTo && dateTo.value ? new Date(dateTo.value + 'T23:59:59') : null;

    if (!q && !from && !to) {
        resultsEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-secondary);font-size:13px;">输入关键词或选择日期开始搜索</div>';
        return;
    }

    const allMessages = typeof messages !== 'undefined' ? messages : [];
    const results = allMessages.filter(m => {
        if (m.type === 'system') return false;
        const ts = m.timestamp ? new Date(m.timestamp) : null;
        if (from && ts && ts < from) return false;
        if (to && ts && ts > to) return false;
        if (q && m.text && m.text.toLowerCase().includes(q)) return true;
        if (q && !m.text && m.image) return false; 
        return !q; 
    });

    if (results.length === 0) {
        resultsEl.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-secondary);font-size:13px;">未找到 "${q || '相关'}" 的消息</div>`;
        return;
    }

    const myAvatarEl = typeof DOMElements !== 'undefined' ? DOMElements.me.avatar : null;
    const partnerAvatarEl = typeof DOMElements !== 'undefined' ? DOMElements.partner.avatar : null;
    const myImg = myAvatarEl ? myAvatarEl.querySelector('img') : null;
    const partnerImg = partnerAvatarEl ? partnerAvatarEl.querySelector('img') : null;

    function getAvatarHtml(isUser) {
        const img = isUser ? myImg : partnerImg;
        if (img) return `<img src="${img.src}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
        return `<div style="width:28px;height:28px;border-radius:50%;background:rgba(var(--accent-color-rgb),0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-user" style="font-size:11px;color:var(--accent-color);"></i></div>`;
    }

    function highlight(text, keyword) {
        if (!keyword) return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const re = new RegExp('(' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        return escaped.replace(re, '<mark style="background:rgba(var(--accent-color-rgb),0.25);color:var(--accent-color);border-radius:2px;padding:0 1px;">$1</mark>');
    }

    resultsEl.innerHTML = results.slice(0, 100).map(msg => {
        const isUser = msg.sender === 'user';
        const senderName = isUser
            ? ((typeof settings !== 'undefined' && settings.myName) || '我')
            : ((typeof settings !== 'undefined' && settings.partnerName) || msg.sender || '对方');
        const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN', {
            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        }) : '';
        const content = msg.text
            ? highlight(msg.text, q)
            : (msg.image ? `<img src="${msg.image}" style="max-height:60px;border-radius:6px;display:block;margin-top:4px;" loading="lazy">` : '');
        return `<div style="display:flex;gap:10px;align-items:flex-start;padding:11px 12px;border-radius:12px;background:var(--primary-bg);border:1px solid var(--border-color);margin-bottom:8px;cursor:pointer;"
            onclick="if(typeof showNotification==='function')showNotification('已定位消息', 'info', 1500); if(typeof scrollToQuotedMessage==='function'){var el=document.createElement('div');el.dataset.replyId='${msg.id}';scrollToQuotedMessage(el);}">
            ${getAvatarHtml(isUser)}
            <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                    <span style="font-size:12px;font-weight:600;color:var(--accent-color);">${senderName}</span>
                    <span style="font-size:11px;color:var(--text-secondary);">${ts}</span>
                </div>
                <div style="font-size:13px;color:var(--text-primary);line-height:1.5;word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${content}</div>
            </div>
        </div>`;
    }).join('') + (results.length > 100 ? `<div style="text-align:center;padding:10px;font-size:12px;color:var(--text-secondary);">仅显示前100条，共找到 ${results.length} 条</div>` : '');
};

let wheelOptions = ["是", "否", "再想一想", "听你的"];
let wheelResultText = "";

function initDecisionModule() {
    const entryBtn = document.getElementById('decision-function'); 
    if(entryBtn) {
        const newBtn = entryBtn.cloneNode(true);
        entryBtn.parentNode.replaceChild(newBtn, entryBtn);
        newBtn.addEventListener('click', () => {
            hideModal(document.getElementById('advanced-modal'));
            showModal(document.getElementById('decision-menu-modal'));
        });
    }

    const openCoinBtn = document.getElementById('open-coin-toss');
    const openWheelBtn = document.getElementById('open-wheel');
    const closeMenuBtn = document.getElementById('close-decision-menu');
    const closeWheelBtn = document.getElementById('close-wheel');
    const addOptionBtn = document.getElementById('add-wheel-option');
    const spinBtn = document.getElementById('spin-wheel-btn');
    const sendResultBtn = document.getElementById('send-wheel-result');

    if (openCoinBtn && !openCoinBtn.dataset.initialized) {
        openCoinBtn.addEventListener('click', () => {
            hideModal(document.getElementById('decision-menu-modal'));
            handleCoinToss();
        });
        openCoinBtn.dataset.initialized = 'true';
    }

    if (openWheelBtn && !openWheelBtn.dataset.initialized) {
        openWheelBtn.addEventListener('click', () => {
            hideModal(document.getElementById('decision-menu-modal'));
            initPicker();
            showModal(document.getElementById('wheel-modal'));
        });
        openWheelBtn.dataset.initialized = 'true';
    }
    
    if (closeMenuBtn && !closeMenuBtn.dataset.initialized) {
        closeMenuBtn.addEventListener('click', () => hideModal(document.getElementById('decision-menu-modal')));
        closeMenuBtn.dataset.initialized = 'true';
    }

    if (closeWheelBtn && !closeWheelBtn.dataset.initialized) {
        closeWheelBtn.addEventListener('click', () => hideModal(document.getElementById('wheel-modal')));
        closeWheelBtn.dataset.initialized = 'true';
    }

    if (addOptionBtn && !addOptionBtn.dataset.initialized) {
        addOptionBtn.addEventListener('click', () => {
            wheelOptions.push(`选项 ${wheelOptions.length + 1}`);
            renderPickerOptions();
            renderPickerCards();
        });
        addOptionBtn.dataset.initialized = 'true';
    }

    if (spinBtn && !spinBtn.dataset.initialized) {
        spinBtn.addEventListener('click', doPick);
        spinBtn.dataset.initialized = 'true';
    }
    
    if (sendResultBtn && !sendResultBtn.dataset.initialized) {
        sendResultBtn.addEventListener('click', () => {
            if(wheelResultText) {
                sendMessage(`✨ 随机抽签结果：${wheelResultText}`, 'normal');
                hideModal(document.getElementById('wheel-modal'));
                wheelResultText = "";
                sendResultBtn.style.display = 'none';
                const resultEl = document.getElementById('wheel-result');
                if (resultEl) { resultEl.textContent = ""; resultEl.classList.remove('show'); }
                spinBtn.disabled = false;
            }
        });
        sendResultBtn.dataset.initialized = 'true';
    }
}

function initPicker() {
    renderPickerOptions();
    renderPickerCards();
    const result = document.getElementById('wheel-result');
    const sendBtn = document.getElementById('send-wheel-result');
    const spinBtn = document.getElementById('spin-wheel-btn');
    if (result) { result.textContent = ""; result.classList.remove('show'); }
    if (sendBtn) sendBtn.style.display = 'none';
    if (spinBtn) spinBtn.disabled = false;
    wheelResultText = "";
}

function renderPickerOptions() {
    const list = document.getElementById('wheel-options-list');
    if (!list) return;
    list.innerHTML = '';
    const colors = ['#FFD93D','#FF6B6B','#6BCB77','#4D96FF','#E0C3FC','#FF9A8B','#A8D8EA','#C44569'];
    wheelOptions.forEach((opt, index) => {
        const item = document.createElement('div');
        item.className = 'picker-option-item';
        item.innerHTML = `
            <div class="picker-option-color-dot" style="background:${colors[index % colors.length]}"></div>
            <input type="text" class="picker-option-input" value="${opt}" placeholder="输入选项...">
            <span class="picker-option-remove"><i class="fas fa-times"></i></span>
        `;
        item.querySelector('input').addEventListener('input', (e) => {
            wheelOptions[index] = e.target.value;
            renderPickerCards();
        });
        item.querySelector('.picker-option-remove').addEventListener('click', () => {
            if(wheelOptions.length <= 2) {
                showNotification('至少保留两个选项', 'warning');
                return;
            }
            wheelOptions.splice(index, 1);
            renderPickerOptions();
            renderPickerCards();
        });
        list.appendChild(item);
    });
}

function renderPickerCards(selectedIndex = -1) {
    const row = document.getElementById('picker-cards-row');
    if (!row) return;
    const colors = ['#FFD93D','#FF6B6B','#6BCB77','#4D96FF','#E0C3FC','#FF9A8B','#A8D8EA','#C44569'];
    row.innerHTML = '';
    wheelOptions.forEach((opt, i) => {
        const card = document.createElement('div');
        card.className = 'picker-card';
        if (selectedIndex >= 0) {
            if (i === selectedIndex) card.classList.add('selected');
            else card.classList.add('unselected');
        }
        if (selectedIndex >= 0 && i === selectedIndex) {
            card.style.background = `linear-gradient(135deg, ${colors[i % colors.length]}, ${colors[(i+2) % colors.length]})`;
        } else {
            card.style.borderTop = `3px solid ${colors[i % colors.length]}`;
        }
        card.style.animationDelay = (i * 0.06) + 's';
        const label = opt || `选项${i+1}`;
        card.textContent = label.length > 6 ? label.slice(0,5) + '…' : label;
        row.appendChild(card);
    });
}

function doPick() {
    if (wheelOptions.length < 2) {
        showNotification("请至少添加两个选项", "warning");
        return;
    }
    const spinBtn = document.getElementById('spin-wheel-btn');
    const resultDisplay = document.getElementById('wheel-result');
    const sendBtn = document.getElementById('send-wheel-result');
    
    spinBtn.disabled = true;
    sendBtn.style.display = 'none';
    resultDisplay.classList.remove('show');
    resultDisplay.textContent = "";

    let flashCount = 0;
    const totalFlashes = 16 + Math.floor(Math.random() * 8);
    const finalIndex = Math.floor(Math.random() * wheelOptions.length);
    
    function flash() {
        const row = document.getElementById('picker-cards-row');
        if (!row) return;
        const cards = row.querySelectorAll('.picker-card');
        cards.forEach(c => c.style.transform = '');
        
        let showIdx;
        if (flashCount < totalFlashes - 3) {
            showIdx = Math.floor(Math.random() * wheelOptions.length);
        } else {
            showIdx = finalIndex;
        }
        
        cards.forEach((c, i) => {
            if (i === showIdx) {
                c.style.transform = 'translateY(-4px) scale(1.06)';
                c.style.background = `linear-gradient(135deg, var(--accent-color), rgba(var(--accent-color-rgb),0.7))`;
                c.style.borderColor = 'transparent';
                c.style.color = '#fff';
            } else {
                c.style.transform = '';
                c.style.background = '';
                c.style.borderColor = '';
                c.style.color = '';
            }
        });
        
        flashCount++;
        const delay = flashCount < 8 ? 80 : flashCount < 14 ? 130 : 250;
        if (flashCount < totalFlashes) {
            setTimeout(flash, delay);
        } else {
            setTimeout(() => {
                renderPickerCards(finalIndex);
                wheelResultText = wheelOptions[finalIndex];
                resultDisplay.innerHTML = `<i class="fas fa-star" style="font-size:14px; margin-right:6px;"></i>${wheelResultText}`;
                resultDisplay.classList.add('show');
                spinBtn.disabled = false;
                sendBtn.style.display = 'inline-block';
                playSound('favorite');
            }, 300);
        }
    }
    
    flash();
}


function initComboMenu() {
    const comboBtn = document.getElementById('combo-btn');
    const picker = document.getElementById('user-sticker-picker');
    const contentArea = document.getElementById('combo-content-area');
    
    if (!comboBtn || !picker) return;
    
    if (comboBtn.dataset.initialized) return;
    
    comboBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = picker.classList.contains('active');
        
        if (isActive) {
            picker.classList.remove('active');
        } else {
            switchTab('my-sticker');
            picker.classList.add('active');
        }
    });
    
    comboBtn.dataset.initialized = 'true';

    document.addEventListener('click', (e) => {
        if (!picker.contains(e.target) && !comboBtn.contains(e.target)) {
            picker.classList.remove('active');
        }
    });

    const tabs = picker.querySelectorAll('.combo-tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tabId = btn.dataset.tab;
            switchTab(tabId);
        });
    });

    function updateAddBtnVisibility(tabId) {
        const addBtn = document.getElementById('sticker-add-btn');
        if (addBtn) addBtn.style.display = (tabId === 'my-sticker') ? 'flex' : 'none';
    }

    function switchTab(tabId) {
        tabs.forEach(b => b.classList.remove('active'));
        const activeBtn = Array.from(tabs).find(b => b.dataset.tab === tabId);
        if (activeBtn) activeBtn.classList.add('active');
        updateAddBtnVisibility(tabId);

        if (tabId === 'my-sticker') {
            renderMyStickerLibrary();
        } else if (tabId === 'partner-sticker') {
            renderPartnerStickerLibrary();
        } else {
            renderUserPokeMenu();
        }
    }

    function makeStickerItem(src, onClick) {
        const item = document.createElement('div');
        item.className = 'sticker-grid-item';
        item.innerHTML = `<img src="${src}" loading="lazy">`;
        item.onclick = (e) => { e.stopPropagation(); onClick(); };
        return item;
    }

    function makeDeletableStickerItem(src, onClick, onDelete) {
        const item = document.createElement('div');
        item.className = 'sticker-grid-item';
        item.style.position = 'relative';
        item.innerHTML = `<img src="${src}" loading="lazy"><div class="sticker-delete-btn" title="删除"><i class="fas fa-times"></i></div>`;
        item.querySelector('img').onclick = (e) => { e.stopPropagation(); onClick(); };
        item.querySelector('.sticker-delete-btn').onclick = (e) => { e.stopPropagation(); onDelete(); };
        return item;
    }

    function renderMyStickerLibrary() {
        contentArea.innerHTML = '';
        if (!myStickerLibrary || myStickerLibrary.length === 0) {
            contentArea.innerHTML = `
                <div class="empty-sticker-tip">
                    <i class="fas fa-user-circle"></i>
                    还没有我的专属表情哦<br>
                    点击右上角"添加"按钮上传图片~
                </div>
            `;
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'sticker-grid-view';
        myStickerLibrary.forEach((src, idx) => {
            const item = makeDeletableStickerItem(src, () => {
                addMessage({ id: Date.now(), sender: 'user', text: '', timestamp: new Date(), image: src, status: 'sent', type: 'normal' });
                playSound('send');
                picker.classList.remove('active');
                const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                setTimeout(simulateReply, settings.replyDelayMin + Math.random() * delayRange);
            }, () => {
                myStickerLibrary.splice(idx, 1);
                localforage.setItem(getStorageKey('myStickerLibrary'), myStickerLibrary);
                showNotification('✓ 已删除', 'success');
                renderMyStickerLibrary();
            });
            grid.appendChild(item);
        });
        contentArea.appendChild(grid);
    }

    function renderPartnerStickerLibrary() {
        contentArea.innerHTML = '';
        if (!stickerLibrary || stickerLibrary.length === 0) {
            contentArea.innerHTML = `
                <div class="empty-sticker-tip">
                    <i class="far fa-images"></i>
                    对方表情库还是空的哦<br>
                    请去"高级功能"->"自定义回复"->"表情库"中添加图片~
                </div>
            `;
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'sticker-grid-view';
        stickerLibrary.forEach(src => {
            const item = makeStickerItem(src, () => {
                addMessage({ id: Date.now(), sender: 'user', text: '', timestamp: new Date(), image: src, status: 'sent', type: 'normal' });
                playSound('send');
                picker.classList.remove('active');
                const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                setTimeout(simulateReply, settings.replyDelayMin + Math.random() * delayRange);
            });
            grid.appendChild(item);
        });
        contentArea.appendChild(grid);
    }

    function renderStickerLibrary() { renderMyStickerLibrary(); }
    function renderUserPokeMenu() {
        contentArea.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'poke-list-view';

        const customBtn = document.createElement('button');
        customBtn.className = 'custom-poke-btn';
        customBtn.innerHTML = '<i class="fas fa-pen"></i> 自定义动作';
        customBtn.onclick = (e) => {
            e.stopPropagation();
            picker.classList.remove('active');
            if (DOMElements.pokeModal.input) {
                DOMElements.pokeModal.input.value = settings.myPokeText || '';
            }
            showModal(DOMElements.pokeModal.modal, DOMElements.pokeModal.input);
        };
        wrapper.appendChild(customBtn);

        const userPresets = [
            "拍了拍对方的头",
            "戳了戳对方的脸颊",
            "抱住了对方",
            "给对方比了个心",
            "牵起了对方的手",
            "看着对方发呆"
        ];

        const title = document.createElement('div');
        title.style.fontSize = '12px';
        title.style.color = 'var(--text-secondary)';
        title.style.marginBottom = '5px';
        title.innerText = '快捷动作';
        wrapper.appendChild(title);

        userPresets.forEach(text => {
            const item = document.createElement('div');
            item.className = 'poke-quick-item';
            item.innerText = text;
            item.onclick = (e) => {
                e.stopPropagation();
                addMessage({
                    id: Date.now(),
                    text: _formatPokeText(text), 
                    timestamp: new Date(),
                    type: 'system' 
                });
                picker.classList.remove('active');
                
                setTimeout(simulateReply, 1500);
            };
            wrapper.appendChild(item);
        });

        contentArea.appendChild(wrapper);
    }
}

(function() {
    var STOP_WORDS = new Set([
        '的','了','是','我','你','他','她','它','们','这','那','有','在','就','也','都',
        '和','与','或','但','不','没','很','太','更','最','已','被','让','把','对','从',
        '到','于','以','为','之','其','而','则','所','等','啊','哦','嗯','哈','呢','吧',
        '吗','嘛','呀','哇','哎','唉','嗯嗯','哈哈','嘻嘻','呵呵','哦哦','啊啊','哈哈哈',
        '一','二','三','四','五','六','七','八','九','十','个','次','条','件','种',
        '好','行','可以','可','又','再','还','来','去','说','想','知道','觉得','感觉',
        '什么','怎么','为什么','哪','谁','哪里','怎样','如何','这么','那么',
        '然后','因为','所以','如果','虽然','但是','而且','不过','只是','只有',
        '没有','不是','还是','就是','真的','对啊','好的','好吧','那个','这个',
        '今天','昨天','明天','现在','以前','以后','时候','时间','一下','一直','一个',
        'ok','OK','Ok','yes','no','hh','hhhh','hhh','嗯','额',
        '图片','表情','语音','【图片】','【表情】','【语音】','撤回了一条消息','已撤回'
    ]);

    function tokenize(text) {
        text = text
            .replace(/https?:\/\/\S+/g, '')
            .replace(/\[.*?\]/g, '')
            .replace(/<[^>]+>/g, '')
            .replace(/[^\u4e00-\u9fa5a-zA-Z]/g, ' ')
            .toLowerCase();
        var words = {};
        var cn = text.replace(/[a-z ]/g, '');
        // 使用非重叠分词：优先提取长词，避免"我想你"同时产生"我想"和"想你"
        // 策略：对每个起点只取一次最长匹配（4>3>2），跳过已覆盖字符
        var covered = new Array(cn.length).fill(false);
        // 先扫一遍提取4字词
        for (var i = 0; i + 4 <= cn.length; i++) {
            var w4 = cn.slice(i, i + 4);
            if (!STOP_WORDS.has(w4)) {
                words[w4] = (words[w4] || 0) + 2.4;
                covered[i] = covered[i+1] = covered[i+2] = covered[i+3] = true;
                i += 3; // 跳过已覆盖字符
            }
        }
        // 再扫3字词（跳过已覆盖位置）
        covered = new Array(cn.length).fill(false); // 重置，用于3字
        for (var j = 0; j + 3 <= cn.length; j++) {
            var w3 = cn.slice(j, j + 3);
            if (!STOP_WORDS.has(w3)) {
                words[w3] = (words[w3] || 0) + 1.8;
                j += 2;
            }
        }
        // 2字词：步长2，非重叠，不与已有词重复计数
        for (var k = 0; k + 2 <= cn.length; k += 2) {
            var w2 = cn.slice(k, k + 2);
            if (!STOP_WORDS.has(w2)) {
                words[w2] = (words[w2] || 0) + 1;
            }
        }
        // 英文单词（长度≥3）
        (text.match(/[a-z]{3,}/g) || []).forEach(function(w) {
            if (!STOP_WORDS.has(w)) words[w] = (words[w] || 0) + 1;
        });
        return words;
    }

    function mergeFreq(a, b) {
        var o = Object.assign({}, a);
        Object.keys(b).forEach(function(k) { o[k] = (o[k] || 0) + b[k]; });
        return o;
    }

    function topWords(freq, n) {
        var min = Object.keys(freq).length > 60 ? 2 : 1;
        return Object.entries(freq)
            .filter(function(e) { return e[1] >= min && e[0].length >= 2; })
            .sort(function(a, b) { return b[1] - a[1]; })
            .slice(0, n)
            .map(function(e) { return { word: e[0], count: e[1] }; });
    }

    function resolveFont() {
        var el = document.createElement('span');
        el.style.cssText = 'position:absolute;visibility:hidden;font-family:var(--font-family)';
        document.body.appendChild(el);
        var f = getComputedStyle(el).fontFamily || '"PingFang SC","Microsoft YaHei",sans-serif';
        document.body.removeChild(el);
        return f;
    }

    function hex3(hex) {
        hex = hex.replace('#','');
        if (hex.length === 3) hex = hex.split('').map(function(c){return c+c;}).join('');
        var n = parseInt(hex, 16);
        return [(n>>16)&255, (n>>8)&255, n&255];
    }
    function drawWordCloud(canvas, words) {
        var ctx   = canvas.getContext('2d');
        var dpr   = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var W = canvas.width / dpr;
        var H = canvas.height / dpr;

        var cs     = getComputedStyle(document.documentElement);
        var accent = cs.getPropertyValue('--accent-color').trim() || '#c5a47e';
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        var rgb    = hex3(accent);
        var font   = resolveFont();

        ctx.fillStyle = isDark ? '#141414' : '#ffffff';
        ctx.fillRect(0, 0, W, H);

        if (!words.length) return;

        var maxC = words[0].count;
        var minC = words[words.length - 1].count;
        var placed = [];

        var MIN_F = 11, MAX_F = 54;

        function fontSize(c) {
            if (maxC === minC) return 24;
            var t = Math.log(1 + c - minC) / Math.log(1 + maxC - minC);
            return Math.round(MIN_F + t * (MAX_F - MIN_F));
        }

        function wordAlpha(idx, total) {
            if (idx === 0) return 1.0;
            if (idx < 3)   return 0.82;
            if (idx < 8)   return 0.64;
            if (idx < 20)  return 0.46;
            return Math.max(0.20, 0.46 - (idx - 20) / total * 0.25);
        }

        function tilt(word, idx) {
            if (idx < 5) return 0;
            var h = 0;
            for (var i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) | 0;
            return (Math.abs(h) % 6 === 0) ? (Math.PI / 2) : 0;
        }

        function overlaps(x, y, w, h, pad) {
            for (var i = 0; i < placed.length; i++) {
                var p = placed[i];
                if (x - pad < p.x + p.w && x + w + pad > p.x &&
                    y - pad < p.y + p.h && y + h + pad > p.y) return true;
            }
            return false;
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;

        words.forEach(function(item, idx) {
            var fs  = fontSize(item.count);
            var fw  = idx < 2 ? '800' : idx < 8 ? '600' : '400';
            var rot = tilt(item.word, idx);
            var a   = wordAlpha(idx, words.length);

            ctx.font = fw + ' ' + fs + 'px ' + font;
            var tw = ctx.measureText(item.word).width;
            var th = fs * 1.25;

            var bw = rot !== 0 ? th + 2 : tw;
            var bh = rot !== 0 ? tw + 2 : th;
            var pad = idx < 3 ? 9 : idx < 12 ? 4 : 2;

            var placed_ = false;
            var cx = W / 2, cy = H / 2;

            for (var t = 0; t < 320; t += 0.09) {
                var ang = t * 2.2;
                var r   = 1.8 * ang;
                var bx  = cx + r * Math.cos(ang) * 1.2 - bw / 2;
                var by  = cy + r * Math.sin(ang) * 0.88 - bh / 2;

                if (bx >= pad && by >= pad && bx + bw <= W - pad && by + bh <= H - pad) {
                    if (!overlaps(bx, by, bw, bh, pad)) {
                        ctx.save();
                        ctx.globalAlpha = a;
                        ctx.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
                        ctx.translate(bx + bw/2, by + bh/2);
                        ctx.rotate(rot);
                        ctx.fillText(item.word, 0, 0);
                        ctx.restore();
                        placed.push({ x: bx, y: by, w: bw, h: bh });
                        placed_ = true;
                        break;
                    }
                }
            }

            if (!placed_) {
                var fsS = Math.max(10, fs * 0.58);
                ctx.font = '400 ' + fsS + 'px ' + font;
                var tw2 = ctx.measureText(item.word).width + 2;
                var th2 = fsS * 1.25;
                for (var fb = 0; fb < 60; fb++) {
                    var fx = 6 + Math.random() * (W - tw2 - 12);
                    var fy = 6 + Math.random() * (H - th2 - 12);
                    if (!overlaps(fx, fy, tw2, th2, 2)) {
                        ctx.save();
                        ctx.globalAlpha = Math.min(a, 0.32);
                        ctx.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
                        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                        ctx.fillText(item.word, fx, fy);
                        ctx.restore();
                        placed.push({ x: fx, y: fy, w: tw2, h: th2 });
                        break;
                    }
                }
            }
        });
    }

    window.renderWordCloud = function() {
        var container = document.getElementById('wordcloud-container');
        if (!container) return;

        if (typeof messages === 'undefined' || !messages || !messages.length) {
            container.innerHTML = '<div class="wc-empty"><i class="fas fa-ghost"></i><p>还没有聊天记录</p><span>多聊几句，词云就会出现～</span></div>';
            return;
        }

        var pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        var mName = (typeof settings !== 'undefined' && settings.myName)      ? settings.myName      : '我';

        var partnerMsgs = messages.filter(function(m) { return m.sender !== 'user' && m.text && m.type !== 'system' && m.type !== 'call-event'; });
        var myMsgs      = messages.filter(function(m) { return m.sender === 'user' && m.text && m.type !== 'system' && m.type !== 'call-event'; });

        var pFreq = {}, mFreq = {};
        partnerMsgs.forEach(function(m) { pFreq = mergeFreq(pFreq, tokenize(m.text)); });
        myMsgs.forEach(function(m)      { mFreq = mergeFreq(mFreq, tokenize(m.text)); });
        var aFreq = mergeFreq(pFreq, mFreq);

        var pTop = topWords(pFreq, 60);
        var mTop = topWords(mFreq, 60);
        var aTop = topWords(aFreq, 60);

        var cur = container._currentView || 'all';

        function data(v) {
            if (v === 'partner') return { words: pTop, total: partnerMsgs.length };
            if (v === 'me')      return { words: mTop, total: myMsgs.length };
            return { words: aTop, total: partnerMsgs.length + myMsgs.length };
        }

        function renderRank(words) {
            var el = container.querySelector('.wc-rank-list');
            if (!el) return;
            if (!words.length) { el.innerHTML = '<div class="wc-rank-empty">暂无数据</div>'; return; }
            var cs     = getComputedStyle(document.documentElement);
            var accent = cs.getPropertyValue('--accent-color').trim() || '#c5a47e';
            var rgb    = hex3(accent);
            var max    = words[0].count;
            el.innerHTML = words.slice(0, 10).map(function(item, i) {
                var pct = Math.round(item.count / max * 100);
                var numStyle = i < 3
                    ? 'color:rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+');font-weight:700;'
                    : 'color:var(--text-secondary);font-weight:500;';
                return '<div class="wc-rank-item">'
                    + '<span class="wc-rank-num" style="'+numStyle+'">' + (i < 9 ? '0'+(i+1) : i+1) + '</span>'
                    + '<span class="wc-rank-word">' + item.word + '</span>'
                    + '<div class="wc-rank-bar-wrap">'
                    +   '<div class="wc-rank-bar" style="width:'+pct+'%;background:rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+(0.2+pct/100*0.6)+');"></div>'
                    + '</div>'
                    + '<span class="wc-rank-count">' + Math.round(item.count) + '</span>'
                    + '</div>';
            }).join('');
        }

        function renderSummary(d) {
            var el = container.querySelector('.wc-summary');
            if (!el) return;
            el.innerHTML =
                '<span class="wc-summary-pill"><i class="fas fa-comment-dots"></i> ' + d.total + ' 条</span>'
                + '<span class="wc-summary-pill"><i class="fas fa-font"></i> ' + d.words.length + ' 词</span>';
        }

        function renderView(v) {
            container._currentView = v;
            container.querySelectorAll('.wc-view-btn').forEach(function(b) {
                b.classList.toggle('active', b.dataset.view === v);
            });
            var canvas = container.querySelector('#wc-canvas');
            if (!canvas) return;
            var d = data(v);
            drawWordCloud(canvas, d.words);
            renderRank(d.words);
            renderSummary(d);
        }

        if (!container.querySelector('#wc-canvas')) {
            var dpr = window.devicePixelRatio || 1;
            var cw  = Math.min(container.offsetWidth || (container.parentElement && container.parentElement.offsetWidth) || 340, 500);
            var ch  = Math.round(cw * 0.72);

            container.innerHTML =
                '<div class="wc-header">'
                +   '<div class="wc-tabs"><div class="wc-tabs-track">'
                +     '<button class="wc-view-btn'+(cur==='all'?' active':'')+'" data-view="all">全部</button>'
                +     '<button class="wc-view-btn'+(cur==='partner'?' active':'')+'" data-view="partner">'+pName+'</button>'
                +     '<button class="wc-view-btn'+(cur==='me'?' active':'')+'" data-view="me">'+mName+'</button>'
                +   '</div></div>'
                +   '<button class="wc-regen-btn" title="换一种布局"><i class="fas fa-redo"></i></button>'
                + '</div>'
                + '<div class="wc-summary"></div>'
                + '<div class="wc-canvas-wrap">'
                +   '<canvas id="wc-canvas" width="'+(cw*dpr)+'" height="'+(ch*dpr)+'" style="width:'+cw+'px;height:'+ch+'px;display:block;"></canvas>'
                + '</div>'
                + '<div class="wc-rank-section">'
                +   '<div class="wc-rank-title"><i class="fas fa-bars"></i> 高频词 Top 10</div>'
                +   '<div class="wc-rank-list"></div>'
                + '</div>';

            container.querySelector('.wc-tabs-track').addEventListener('click', function(e) {
                var b = e.target.closest('.wc-view-btn');
                if (b) renderView(b.dataset.view);
            });
            container.querySelector('.wc-regen-btn').addEventListener('click', function() {
                var canvas = container.querySelector('#wc-canvas');
                var d = data(container._currentView);
                var shuffled = d.words.slice().sort(function(a, b) {
                    return a.count !== b.count ? b.count - a.count : Math.random() - 0.5;
                });
                drawWordCloud(canvas, shuffled);
            });
        }

        renderView(cur);
    };

})();
