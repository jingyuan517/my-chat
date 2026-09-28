/*应用常量与数据结构*/

        var _pathTag = (window.location.pathname || '/')
            .replace(/\/+$/, '')
            .replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .toLowerCase();
        if (_pathTag) _pathTag = '_' + _pathTag;
        const APP_PREFIX = 'CHAT_APP_V3' + _pathTag + '_';
        const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
        const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
        const MESSAGES_PER_PAGE = 50;
        
        const CONSTANTS = {
            PARTNER_STATUSES: [],
            REPLY_MESSAGES: [],
            REPLY_EMOJIS: [],
            POKE_ACTIONS: [
                '拍了拍你',
                '戳了戳你',
                '轻轻揉了揉你的头发',
                '捏了捏你的脸',
                '在你面前挥了挥手',
                '拉了拉你的衣角',
                '轻轻抱了抱你',
                '在你耳边说了一句悄悄话',
                '弹了一下你的额头',
                '牵起了你的手'
            ]
        };

window.APP_PREFIX = APP_PREFIX;
