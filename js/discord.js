/**
 * sixhen · Discord Presence Integration
 * Real-time Lanyard WebSocket (wss://api.lanyard.rest/socket)
 * with automatic heartbeat, reconnect, and REST polling fallback.
 */

(function initDiscordPresence() {
    const USER_ID = '490720573480239104';
    let socket = null;
    let heartbeatTimer = null;
    let spotifyInterval = null;
    let currentSpotify = null;

    // DOM Elements
    const card = document.getElementById('discordCard');
    const avatarImg = document.getElementById('discordAvatar');
    const statusDot = document.getElementById('discordStatusDot');
    const badge = document.getElementById('discordBadge');
    const customStatusEl = document.getElementById('discordCustomStatus');
    const activityBox = document.getElementById('discordActivityBox');
    const activityThumb = document.getElementById('discordActivityThumb');
    const activityTitle = document.getElementById('discordActivityTitle');
    const activityName = document.getElementById('discordActivityName');
    const activityState = document.getElementById('discordActivityState');
    const spotifyProgress = document.getElementById('discordSpotifyProgress');
    const spotifyFill = document.getElementById('discordSpotifyFill');
    const spotifyCurrentTime = document.getElementById('discordSpotifyCurrent');
    const spotifyTotalTime = document.getElementById('discordSpotifyTotal');
    const sidebarBadge = document.querySelector('.sidebar__avatar-badge');

    function formatTime(ms) {
        if (!ms || ms < 0) return '0:00';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    function renderPresence(data) {
        if (!data) return;

        const status = data.discord_status || 'offline';
        const user = data.discord_user;

        // 1. Status indicator & Badges
        if (statusDot) {
            statusDot.className = `discord-card__status-dot ${status}`;
        }
        if (sidebarBadge) {
            const statusColors = {
                online: '#10b981',
                idle: '#f59e0b',
                dnd: '#ef4444',
                offline: '#64748b'
            };
            sidebarBadge.style.backgroundColor = statusColors[status] || '#64748b';
        }
        if (badge) {
            badge.className = `discord-card__badge ${status}`;
            const statusTextMap = {
                online: 'Trực tuyến',
                idle: 'Chờ (Idle)',
                dnd: 'Không làm phiền',
                offline: 'Ngoại tuyến'
            };
            badge.textContent = statusTextMap[status] || status;
        }

        // 2. Avatar
        if (avatarImg && user && user.avatar) {
            const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
            avatarImg.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=160`;
        }

        // 3. Custom Status
        const customActivity = (data.activities || []).find(a => a.type === 4);
        if (customStatusEl) {
            if (customActivity && (customActivity.state || customActivity.emoji)) {
                let emojiHtml = '';
                if (customActivity.emoji) {
                    if (customActivity.emoji.id) {
                        emojiHtml = `<img src="https://cdn.discordapp.com/emojis/${customActivity.emoji.id}.png" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;" />`;
                    } else if (customActivity.emoji.name) {
                        emojiHtml = `<span style="margin-right:4px;">${customActivity.emoji.name}</span>`;
                    }
                }
                customStatusEl.innerHTML = `${emojiHtml}${customActivity.state || ''}`;
                customStatusEl.style.display = 'flex';
            } else {
                customStatusEl.textContent = '✨ Ít nói. Quan sát nhiều.';
                customStatusEl.style.display = 'flex';
            }
        }

        // 4. Spotify or Game Activity
        if (data.listening_to_spotify && data.spotify) {
            currentSpotify = data.spotify;
            renderSpotify(data.spotify);
        } else {
            currentSpotify = null;
            if (spotifyInterval) clearInterval(spotifyInterval);

            // Check for regular activity (game, coding, etc.)
            const gameActivity = (data.activities || []).find(a => a.type !== 4);
            if (gameActivity) {
                renderGame(gameActivity);
            } else {
                renderIdleActivity(status);
            }
        }
    }

    function renderSpotify(spotify) {
        if (!activityBox) return;
        activityBox.className = 'discord-card__activity-box spotify';
        activityBox.style.display = 'flex';

        if (activityThumb) {
            activityThumb.src = spotify.album_art_url;
            activityThumb.className = 'discord-activity-thumb spin';
            activityThumb.style.display = 'block';
        }
        if (activityTitle) activityTitle.textContent = '🎧 Đang nghe Spotify';
        if (activityName) activityName.textContent = spotify.song;
        if (activityState) activityState.textContent = `bởi ${spotify.artist}`;

        if (spotifyProgress) spotifyProgress.style.display = 'flex';

        updateSpotifyTimer();
        if (spotifyInterval) clearInterval(spotifyInterval);
        spotifyInterval = setInterval(updateSpotifyTimer, 1000);
    }

    function updateSpotifyTimer() {
        if (!currentSpotify || !currentSpotify.timestamps) return;
        const start = currentSpotify.timestamps.start;
        const end = currentSpotify.timestamps.end;
        const duration = end - start;
        const now = Date.now();
        const elapsed = Math.max(0, Math.min(now - start, duration));
        const percent = Math.min(100, Math.max(0, (elapsed / duration) * 100));

        if (spotifyFill) spotifyFill.style.width = `${percent}%`;
        if (spotifyCurrentTime) spotifyCurrentTime.textContent = formatTime(elapsed);
        if (spotifyTotalTime) spotifyTotalTime.textContent = formatTime(duration);
    }

    function renderGame(act) {
        if (!activityBox) return;
        activityBox.className = 'discord-card__activity-box';
        activityBox.style.display = 'flex';

        if (spotifyProgress) spotifyProgress.style.display = 'none';

        if (activityThumb) {
            activityThumb.className = 'discord-activity-thumb';
            if (act.assets && act.assets.large_image) {
                if (act.assets.large_image.startsWith('mp:external/')) {
                    activityThumb.src = `https://media.discordapp.net/external/${act.assets.large_image.replace('mp:external/', '')}`;
                } else {
                    activityThumb.src = `https://cdn.discordapp.com/app-assets/${act.application_id}/${act.assets.large_image}.png`;
                }
                activityThumb.style.display = 'block';
            } else {
                activityThumb.src = 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png';
                activityThumb.style.display = 'block';
            }
        }

        const typeLabels = {
            0: '🎮 Đang chơi game',
            1: '📡 Đang phát trực tiếp',
            2: '🎵 Đang nghe',
            3: '🎬 Đang xem',
            5: '🏆 Đang thi đấu'
        };
        if (activityTitle) activityTitle.textContent = typeLabels[act.type] || '⚡ Đang hoạt động';
        if (activityName) activityName.textContent = act.name || 'Không xác định';
        if (activityState) {
            const details = [act.details, act.state].filter(Boolean).join(' · ');
            activityState.textContent = details || 'Không có chi tiết';
        }
    }

    function renderIdleActivity(status) {
        if (!activityBox) return;
        if (spotifyProgress) spotifyProgress.style.display = 'none';

        if (status === 'offline') {
            activityBox.className = 'discord-card__activity-box';
            activityBox.style.display = 'flex';
            if (activityThumb) activityThumb.style.display = 'none';
            if (activityTitle) activityTitle.textContent = '💤 Trạng thái';
            if (activityName) activityName.textContent = 'Đang ngoại tuyến';
            if (activityState) activityState.textContent = 'Hẹn gặp lại bạn sau!';
        } else {
            activityBox.className = 'discord-card__activity-box';
            activityBox.style.display = 'flex';
            if (activityThumb) activityThumb.style.display = 'none';
            if (activityTitle) activityTitle.textContent = '✨ Trạng thái';
            if (activityName) activityName.textContent = 'Đang trực tuyến';
            if (activityState) activityState.textContent = 'Sẵn sàng kết nối!';
        }
    }

    // Connect Lanyard WebSocket
    function connectLanyardSocket() {
        try {
            socket = new WebSocket('wss://api.lanyard.rest/socket');

            socket.onopen = function () {
                // Connection open, waiting for opcode 1 (Hello)
            };

            socket.onmessage = function (event) {
                try {
                    const message = JSON.parse(event.data);
                    const { op, d, t } = message;

                    if (op === 1) {
                        // Hello event: receive heartbeat interval
                        const interval = d.heartbeat_interval;
                        if (heartbeatTimer) clearInterval(heartbeatTimer);
                        heartbeatTimer = setInterval(() => {
                            if (socket && socket.readyState === WebSocket.OPEN) {
                                socket.send(JSON.stringify({ op: 3 }));
                            }
                        }, interval);

                        // Subscribe to user presence
                        socket.send(JSON.stringify({
                            op: 2,
                            d: {
                                subscribe_to_id: USER_ID
                            }
                        }));
                    } else if (op === 0) {
                        // Event dispatch: INIT_STATE or PRESENCE_UPDATE
                        if (t === 'INIT_STATE' || t === 'PRESENCE_UPDATE') {
                            renderPresence(d);
                        }
                    }
                } catch (err) {
                    console.warn('Lanyard socket message parse error:', err);
                }
            };

            socket.onclose = function () {
                if (heartbeatTimer) clearInterval(heartbeatTimer);
                // Reconnect after 4s or fallback to REST
                setTimeout(connectLanyardSocket, 4000);
            };

            socket.onerror = function () {
                fallbackREST();
            };
        } catch (err) {
            fallbackREST();
        }
    }

    // Fallback REST API
    async function fallbackREST() {
        try {
            const res = await fetch(`https://api.lanyard.rest/v1/users/${USER_ID}`);
            const json = await res.json();
            if (json.success && json.data) {
                renderPresence(json.data);
            }
        } catch (e) {
            renderIdleActivity('offline');
        }
    }

    // Initialize
    connectLanyardSocket();
    fallbackREST(); // Initial fast fetch
})();
