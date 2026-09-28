(function () {
    'use strict';

    var CFG_KEY = '_cloud_sync_config';
    var config = {
        serverUrl: '',
        deviceToken: '',
        enabled: false,
        lastSyncTime: null
    };

    function loadConfig() {
        try {
            var raw = localStorage.getItem(CFG_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed.serverUrl) config.serverUrl = parsed.serverUrl;
                if (parsed.deviceToken) config.deviceToken = parsed.deviceToken;
                if (parsed.enabled !== undefined) config.enabled = parsed.enabled;
                if (parsed.lastSyncTime) config.lastSyncTime = parsed.lastSyncTime;
            }
        } catch (e) {}
    }

    function saveConfig() {
        try {
            localStorage.setItem(CFG_KEY, JSON.stringify(config));
        } catch (e) {}
    }

    function generateDeviceToken() {
        var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var r = '';
        for (var i = 0; i < 24; i++) {
            r += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return 'dev_' + Date.now().toString(36) + '_' + r;
    }

    var syncInProgress = false;

    async function syncMessagesToCloud(messages, sessionId) {
        if (!config.enabled || !config.serverUrl) return false;
        if (syncInProgress) return false;
        syncInProgress = true;
        try {
            var url = config.serverUrl.replace(/\/+$/, '') + '/api/sync/messages';
            var res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Token': config.deviceToken
                },
                body: JSON.stringify({ messages: messages, sessionId: sessionId })
            });
            if (!res.ok) {
                console.warn('[cloud-sync] 上传失败:', res.status);
                return false;
            }
            config.lastSyncTime = new Date().toISOString();
            saveConfig();
            return true;
        } catch (e) {
            console.warn('[cloud-sync] 上传异常(网络不通?):', e);
            return false;
        } finally {
            syncInProgress = false;
        }
    }

    async function fetchMessagesFromCloud(sessionId) {
        if (!config.enabled || !config.serverUrl) return null;
        try {
            var url = config.serverUrl.replace(/\/+$/, '') + '/api/sync/messages?sessionId=' + encodeURIComponent(sessionId);
            var res = await fetch(url, {
                headers: { 'X-Device-Token': config.deviceToken }
            });
            if (!res.ok) return null;
            var data = await res.json();
            if (data && Array.isArray(data.messages) && data.messages.length > 0) {
                return data.messages;
            }
            return null;
        } catch (e) {
            console.warn('[cloud-sync] 下载异常:', e);
            return null;
        }
    }

    function isServerReachable() {
        if (!config.serverUrl) return Promise.resolve(false);
        var url = config.serverUrl.replace(/\/+$/, '') + '/api/health';
        return fetch(url, { method: 'GET' })
            .then(function (r) { return r.ok; })
            .catch(function () { return false; });
    }

    window._onDataSaved = async function () {
        if (!config.enabled || !config.serverUrl) return;
        if (typeof SESSION_ID === 'undefined' || !SESSION_ID) return;
        if (typeof messages === 'undefined') return;
        try {
            var msgs = messages.map(function (m) {
                var copy = {};
                for (var k in m) {
                    if (Object.prototype.hasOwnProperty.call(m, k)) {
                        copy[k] = m[k] instanceof Date ? m[k].toISOString() : m[k];
                    }
                }
                return copy;
            });
            await syncMessagesToCloud(msgs, SESSION_ID);
        } catch (e) {
            console.warn('[cloud-sync] _onDataSaved error:', e);
        }
    };

    window._onDataLoaded = async function () {
        if (!config.enabled || !config.serverUrl) return;
        if (typeof SESSION_ID === 'undefined' || !SESSION_ID) return;
        if (typeof messages === 'undefined') return;

        if (Array.isArray(messages) && messages.length > 0) {
            return;
        }

        var cloudMsgs = await fetchMessagesFromCloud(SESSION_ID);
        if (cloudMsgs && cloudMsgs.length > 0) {
            messages = cloudMsgs.map(function (m) {
                return Object.assign({}, m, { timestamp: new Date(m.timestamp) });
            });
            if (typeof renderMessages === 'function') {
                setTimeout(renderMessages, 100);
            }
            if (typeof showNotification === 'function') {
                showNotification('已从云端恢复 ' + messages.length + ' 条聊天记录', 'success', 4000);
            }
        }
    };

    function renderCloudSettingsUI() {
        var dmBody = document.querySelector('.dm-body');
        if (!dmBody) return;

        var section = document.createElement('div');
        section.className = 'cloud-sync-section';
        section.style.cssText = 'margin-top:20px;border-top:1px solid var(--border-color);padding-top:16px;';

        var enabled = config.enabled;

        section.innerHTML = `
            <div class="dm-section-label" style="margin-bottom:12px;">
                <i class="fas fa-cloud"></i> 云同步
            </div>
            <div class="dm-row-card" style="margin-bottom:10px;">
                <div class="dm-row-item" style="cursor:default;padding:14px 0;">
                    <div class="dm-row-info" style="flex:1;">
                        <div class="dm-row-title">服务器地址</div>
                        <div class="dm-row-desc">运行后端后填写，手机和电脑需填同一地址</div>
                    </div>
                </div>
                <div style="padding:0 0 12px;">
                    <input type="text" id="cloud-server-url"
                        style="width:100%;padding:9px 12px;border:1px solid var(--border-color);border-radius:10px;font-size:13px;background:var(--primary-bg);color:var(--text-primary);outline:none;font-family:var(--font-family);box-sizing:border-box;"
                        placeholder="例如: http://192.168.1.100:3000"
                        value="${config.serverUrl}">
                </div>
            </div>
            <div class="dm-row-card" style="margin-bottom:10px;">
                <div class="dm-row-item" style="display:flex;align-items:center;gap:12px;padding:12px 0;">
                    <div class="dm-row-info" style="flex:1;">
                        <div class="dm-row-title">启用云同步</div>
                        <div class="dm-row-desc" id="cloud-sync-desc">${enabled ? '已启用 - 保存时自动同步' : '关闭'}</div>
                    </div>
                    <div id="cloud-toggle-pill"
                        style="width:44px;height:24px;border-radius:24px;background:${enabled ? 'var(--accent-color)' : 'var(--border-color)'};position:relative;transition:background 0.3s;flex-shrink:0;cursor:pointer;">
                        <div id="cloud-toggle-knob"
                            style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;${enabled ? 'right:3px' : 'left:3px'};transition:left 0.25s,right 0.25s;box-shadow:0 1px 3px rgba(0,0,0,0.2);">
                        </div>
                    </div>
                </div>
            </div>
            <div class="dm-row-card" style="margin-bottom:10px;">
                <div style="display:flex;gap:8px;padding:4px 0;">
                    <button id="cloud-test-btn" class="modal-btn modal-btn-secondary" style="flex:1;padding:9px 0;font-size:12px;">
                        <i class="fas fa-plug"></i> 测试连接
                    </button>
                    <button id="cloud-sync-now-btn" class="modal-btn modal-btn-primary" style="flex:1;padding:9px 0;font-size:12px;">
                        <i class="fas fa-sync"></i> 立即同步
                    </button>
                    <button id="cloud-forget-btn" class="modal-btn modal-btn-secondary" style="flex:1;padding:9px 0;font-size:12px;color:#ff5050;">
                        <i class="fas fa-trash"></i> 清除
                    </button>
                </div>
            </div>
            <div id="cloud-status-msg" style="font-size:11px;color:var(--text-secondary);padding:6px 10px;border-radius:8px;display:none;"></div>
        `;

        dmBody.appendChild(section);

        var urlInput = document.getElementById('cloud-server-url');
        var togglePill = document.getElementById('cloud-toggle-pill');
        var toggleKnob = document.getElementById('cloud-toggle-knob');
        var desc = document.getElementById('cloud-sync-desc');
        var testBtn = document.getElementById('cloud-test-btn');
        var syncBtn = document.getElementById('cloud-sync-now-btn');
        var forgetBtn = document.getElementById('cloud-forget-btn');
        var statusMsg = document.getElementById('cloud-status-msg');

        function setStatus(text, type) {
            statusMsg.style.display = 'block';
            statusMsg.textContent = text;
            statusMsg.style.background = type === 'ok' ? 'rgba(59,200,164,0.12)' : type === 'err' ? 'rgba(255,80,80,0.12)' : 'rgba(var(--accent-color-rgb),0.06)';
            statusMsg.style.color = type === 'ok' ? '#3BC8A4' : type === 'err' ? '#ff5050' : 'var(--text-secondary)';
            setTimeout(function () {
                statusMsg.style.display = 'none';
            }, 5000);
        }

        urlInput.addEventListener('change', function () {
            config.serverUrl = this.value.trim();
            saveConfig();
        });

        togglePill.addEventListener('click', function () {
            config.enabled = !config.enabled;
            if (config.enabled && !config.deviceToken) {
                config.deviceToken = generateDeviceToken();
            }
            saveConfig();
            togglePill.style.background = config.enabled ? 'var(--accent-color)' : 'var(--border-color)';
            toggleKnob.style.left = config.enabled ? 'auto' : '3px';
            toggleKnob.style.right = config.enabled ? '3px' : 'auto';
            desc.textContent = config.enabled ? '已启用 - 保存时自动同步' : '关闭';
            setStatus(config.enabled ? '云同步已开启' : '云同步已关闭', 'ok');
        });

        testBtn.addEventListener('click', function () {
            var url = (urlInput.value.trim() || config.serverUrl).replace(/\/+$/, '');
            if (!url) {
                setStatus('请先输入服务器地址', 'err');
                return;
            }
            testBtn.disabled = true;
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 检测中...';
            fetch(url + '/api/health')
                .then(function (r) { return r.json(); })
                .then(function (d) {
                    setStatus('连接成功 ✓  服务器时间: ' + (d.time || 'ok'), 'ok');
                    config.serverUrl = url;
                    saveConfig();
                })
                .catch(function () {
                    setStatus('连接失败 ✗  请检查地址和服务器是否启动', 'err');
                })
                .finally(function () {
                    testBtn.disabled = false;
                    testBtn.innerHTML = '<i class="fas fa-plug"></i> 测试连接';
                });
        });

        syncBtn.addEventListener('click', function () {
            if (!config.enabled || !config.serverUrl) {
                setStatus('请先填写地址并开启同步', 'err');
                return;
            }
            syncBtn.disabled = true;
            syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 同步中...';
            var msgs = (typeof messages !== 'undefined' && Array.isArray(messages))
                ? messages.map(function (m) {
                    var copy = {};
                    for (var k in m) {
                        if (Object.prototype.hasOwnProperty.call(m, k)) {
                            copy[k] = m[k] instanceof Date ? m[k].toISOString() : m[k];
                        }
                    }
                    return copy;
                })
                : [];
            syncMessagesToCloud(msgs, typeof SESSION_ID !== 'undefined' ? SESSION_ID : 'default')
                .then(function (ok) {
                    if (ok) {
                        setStatus('同步成功 ✓  已上传 ' + msgs.length + ' 条消息', 'ok');
                    } else {
                        setStatus('同步失败 ✗  请检查服务器状态', 'err');
                    }
                })
                .finally(function () {
                    syncBtn.disabled = false;
                    syncBtn.innerHTML = '<i class="fas fa-sync"></i> 立即同步';
                });
        });

        forgetBtn.addEventListener('click', function () {
            if (!confirm('确定要清除云同步配置(设备Token)吗？\n\n之后需要重新连接服务器。')) return;
            config.serverUrl = '';
            config.deviceToken = '';
            config.enabled = false;
            config.lastSyncTime = null;
            saveConfig();
            if (urlInput) urlInput.value = '';
            togglePill.style.background = 'var(--border-color)';
            toggleKnob.style.left = '3px';
            toggleKnob.style.right = 'auto';
            desc.textContent = '关闭';
            setStatus('已清除配置', 'ok');
        });
    }

    var uiInterval = null;

    function injectUI() {
        var dmBody = document.querySelector('.dm-body');
        var existing = document.querySelector('.cloud-sync-section');
        if (dmBody && !existing) {
            renderCloudSettingsUI();
            if (uiInterval) {
                clearInterval(uiInterval);
                uiInterval = null;
            }
        }
    }

    function waitForModalAndInject() {
        injectUI();
        if (!document.querySelector('.cloud-sync-section')) {
            uiInterval = setInterval(injectUI, 1000);
        }
    }

    var origShowModal = window.showModal;
    if (typeof origShowModal === 'function') {
        window.showModal = function (el) {
            origShowModal.apply(this, arguments);
            if (el && el.id === 'data-modal') {
                setTimeout(waitForModalAndInject, 300);
            }
        };
    }

    loadConfig();

    if (!config.deviceToken) {
        config.deviceToken = generateDeviceToken();
        saveConfig();
    }

    window.CloudSync = {
        getConfig: function () { return config; },
        syncNow: function () {
            if (typeof messages !== 'undefined' && typeof SESSION_ID !== 'undefined') {
                var msgs = messages.map(function (m) {
                    var copy = {};
                    for (var k in m) {
                        if (Object.prototype.hasOwnProperty.call(m, k)) {
                            copy[k] = m[k] instanceof Date ? m[k].toISOString() : m[k];
                        }
                    }
                    return copy;
                });
                return syncMessagesToCloud(msgs, SESSION_ID);
            }
            return Promise.resolve(false);
        },
        testConnection: function () {
            return isServerReachable();
        }
    };

    console.log('[cloud-sync] 模块已加载' + (config.enabled ? '，同步已开启' : '，同步未开启'));
})();
