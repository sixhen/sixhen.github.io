/**
 * sixhen · Audio Player & Playlist Module (Enhanced)
 * Supports playlist, custom drag & drop MP3, visualizer, volume control,
 * scrub seeking, fade in/out, and LocalStorage persistence.
 */

(function initMusicPlayer() {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';

    const playlist = [
        {
            name: 'sixhen Theme',
            artist: '✦ Playlist của sixhen',
            src: 'assets/bg.mp3',
            cover: 'assets/avatar.jpg'
        },
        {
            name: 'Lofi Night Vibes',
            artist: 'Chill Beats',
            src: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
            cover: 'assets/default-cover.svg'
        },
        {
            name: 'Cyberpunk Ambient',
            artist: 'Synthesia Chill',
            src: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-amp-strings-10711.mp3',
            cover: 'assets/default-cover.svg'
        }
    ];

    let currentTrackIndex = 0;
    let isPlaying = false;
    let isShuffle = localStorage.getItem('sixhen_music_shuffle') === 'true';
    let isLoop = localStorage.getItem('sixhen_music_loop') !== 'false';
    let savedVolume = parseFloat(localStorage.getItem('sixhen_music_volume') || '0.7');
    let isDragging = false;
    let isFading = false;

    // Web Audio Analyser
    let audioCtx = null;
    let analyser = null;
    let dataArray = null;
    let sourceNode = null;
    let animFrameId = null;

    // DOM Elements
    const playerContainer = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('audioPlayBtn');
    const playIcon = document.getElementById('audioPlayIcon');
    const prevBtn = document.getElementById('audioPrevBtn');
    const nextBtn = document.getElementById('audioNextBtn');
    const shuffleBtn = document.getElementById('audioShuffleBtn');
    const loopBtn = document.getElementById('audioLoopBtn');
    const muteBtn = document.getElementById('audioMuteBtn');
    const muteIcon = document.getElementById('audioMuteIcon');
    const volumeSlider = document.getElementById('audioVolumeSlider');
    const progressBar = document.getElementById('audioProgressBar');
    const progressFill = document.getElementById('audioProgressFill');
    const currentTimeEl = document.getElementById('audioCurrentTime');
    const totalTimeEl = document.getElementById('audioTotalTime');
    const coverImg = document.getElementById('audioCover');
    const titleEl = document.getElementById('audioTitle');
    const artistEl = document.getElementById('audioArtist');
    const playlistContainer = document.getElementById('audioPlaylistContainer');
    const visBars = document.querySelectorAll('.vis-bar');
    const dropzone = document.getElementById('audioDropzone');

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function initAnalyser() {
        if (analyser) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            audioCtx = new AudioContext();
            sourceNode = audioCtx.createMediaElementSource(audio);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            sourceNode.connect(analyser);
            analyser.connect(audioCtx.destination);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            renderAnalyser();
        } catch (e) {
            // Fallback to CSS rhythm
        }
    }

    function renderAnalyser() {
        if (!analyser || !dataArray) return;
        animFrameId = requestAnimationFrame(renderAnalyser);
        if (!isPlaying) return;

        analyser.getByteFrequencyData(dataArray);
        if (visBars && visBars.length > 0) {
            for (let i = 0; i < visBars.length; i++) {
                const val = dataArray[i * 2] || 0;
                const h = Math.max(4, (val / 255) * 28);
                visBars[i].style.height = `${h}px`;
            }
        }
    }

    function renderPlaylistUI() {
        if (!playlistContainer) return;
        playlistContainer.innerHTML = '';
        playlist.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = `playlist-item ${index === currentTrackIndex ? 'active' : ''}`;
            item.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="fas ${index === currentTrackIndex && isPlaying ? 'fa-volume-high' : 'fa-music'}" style="font-size:12px;"></i>
                    <span>${track.name}</span>
                </div>
                <span style="font-size:12px;color:var(--text-muted);">${track.artist}</span>
            `;
            item.addEventListener('click', () => {
                currentTrackIndex = index;
                loadTrack(currentTrackIndex, true);
                renderPlaylistUI();
            });
            playlistContainer.appendChild(item);
        });
    }

    function loadTrack(index, autoPlay = false) {
        if (index < 0 || index >= playlist.length) return;
        currentTrackIndex = index;
        const track = playlist[currentTrackIndex];

        audio.src = track.src;
        audio.load();

        if (titleEl) titleEl.textContent = track.name;
        if (artistEl) artistEl.textContent = track.artist;
        if (coverImg) coverImg.src = track.cover || 'assets/default-cover.svg';

        updatePlayState(false);
        if (progressFill) progressFill.style.width = '0%';
        if (currentTimeEl) currentTimeEl.textContent = '0:00';

        renderPlaylistUI();

        if (autoPlay) {
            playAudio();
        }
    }

    function fadeIn(targetVolume, callback) {
        if (isFading) return;
        isFading = true;
        audio.volume = 0;
        let v = 0;
        const step = 0.05;
        const interval = setInterval(() => {
            v = Math.min(targetVolume, v + step);
            audio.volume = v;
            if (v >= targetVolume) {
                clearInterval(interval);
                isFading = false;
                if (callback) callback();
            }
        }, 30);
    }

    function fadeOut(callback) {
        if (isFading) return;
        isFading = true;
        let v = audio.volume;
        const step = 0.05;
        const interval = setInterval(() => {
            v = Math.max(0, v - step);
            audio.volume = v;
            if (v <= 0) {
                clearInterval(interval);
                isFading = false;
                if (callback) callback();
            }
        }, 30);
    }

    function playAudio() {
        initAnalyser();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const targetVol = parseFloat(volumeSlider ? volumeSlider.value : '70') / 100;
        audio.play().then(() => {
            updatePlayState(true);
            fadeIn(targetVol);
        }).catch(err => {
            console.warn('Audio playback blocked or waiting user gesture:', err);
            updatePlayState(false);
        });
    }

    function pauseAudio() {
        fadeOut(() => {
            audio.pause();
            updatePlayState(false);
        });
    }

    function togglePlay() {
        if (isPlaying) {
            pauseAudio();
        } else {
            playAudio();
        }
    }

    function updatePlayState(playing) {
        isPlaying = playing;
        if (playerContainer) {
            playerContainer.classList.toggle('playing', isPlaying);
        }
        if (coverImg) {
            coverImg.classList.toggle('playing', isPlaying);
        }
        if (playIcon) {
            playIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }
        renderPlaylistUI();
    }

    function nextTrack() {
        if (isShuffle) {
            let nextIndex = Math.floor(Math.random() * playlist.length);
            if (nextIndex === currentTrackIndex && playlist.length > 1) {
                nextIndex = (nextIndex + 1) % playlist.length;
            }
            loadTrack(nextIndex, true);
        } else {
            const nextIndex = (currentTrackIndex + 1) % playlist.length;
            loadTrack(nextIndex, true);
        }
    }

    function prevTrack() {
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        loadTrack(prevIndex, true);
    }

    // Drag & Drop Custom MP3 File from User's Computer
    function handleDropFile(file) {
        if (!file || !file.type.startsWith('audio/')) {
            if (window.sixhenToast) window.sixhenToast('Vui lòng chọn file âm thanh (.mp3, .wav, .ogg)!', 'error');
            return;
        }

        const url = URL.createObjectURL(file);
        const fileName = file.name.replace(/\.[^/.]+$/, "");

        const newTrack = {
            name: fileName,
            artist: 'Tệp tải lên từ máy bạn',
            src: url,
            cover: 'assets/default-cover.svg'
        };

        playlist.unshift(newTrack);
        currentTrackIndex = 0;
        loadTrack(0, true);

        if (window.sixhenToast) {
            window.sixhenToast(`🎵 Đang phát file của bạn: ${fileName}`, 'success', 4000);
        }
    }

    if (dropzone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('dragover');
            }, false);
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files.length > 0) {
                handleDropFile(dt.files[0]);
            }
        });

        // Click to upload file directly
        const fileInput = document.getElementById('audioFileInput');
        dropzone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    handleDropFile(e.target.files[0]);
                }
            });
        }
    }

    // Event Listeners
    if (playBtn) playBtn.addEventListener('click', togglePlay);
    if (nextBtn) nextBtn.addEventListener('click', nextTrack);
    if (prevBtn) prevBtn.addEventListener('click', prevTrack);

    if (shuffleBtn) {
        shuffleBtn.classList.toggle('active', isShuffle);
        shuffleBtn.addEventListener('click', () => {
            isShuffle = !isShuffle;
            shuffleBtn.classList.toggle('active', isShuffle);
            localStorage.setItem('sixhen_music_shuffle', isShuffle);
            if (window.sixhenToast) window.sixhenToast(isShuffle ? 'Bật phát ngẫu nhiên' : 'Tắt phát ngẫu nhiên');
        });
    }

    if (loopBtn) {
        loopBtn.classList.toggle('active', isLoop);
        loopBtn.addEventListener('click', () => {
            isLoop = !isLoop;
            loopBtn.classList.toggle('active', isLoop);
            localStorage.setItem('sixhen_music_loop', isLoop);
            if (window.sixhenToast) window.sixhenToast(isLoop ? 'Bật lặp lại' : 'Tắt lặp lại');
        });
    }

    audio.addEventListener('timeupdate', () => {
        if (audio.duration && !isDragging) {
            const percent = (audio.currentTime / audio.duration) * 100;
            if (progressFill) progressFill.style.width = `${percent}%`;
            if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    });

    audio.addEventListener('loadedmetadata', () => {
        if (totalTimeEl) totalTimeEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('ended', () => {
        if (isLoop) {
            nextTrack();
        } else {
            updatePlayState(false);
        }
    });

    // Scrub bar seeking
    if (progressBar) {
        const seek = (e) => {
            const rect = progressBar.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            if (progressFill) progressFill.style.width = `${pos * 100}%`;
            if (audio.duration) {
                audio.currentTime = pos * audio.duration;
            }
        };

        progressBar.addEventListener('mousedown', (e) => {
            isDragging = true;
            seek(e);
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) seek(e);
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) isDragging = false;
        });

        progressBar.addEventListener('touchstart', (e) => {
            isDragging = true;
            if (e.touches.length > 0) seek(e.touches[0]);
        });
        window.addEventListener('touchmove', (e) => {
            if (isDragging && e.touches.length > 0) seek(e.touches[0]);
        });
        window.addEventListener('touchend', () => {
            if (isDragging) isDragging = false;
        });
    }

    // Volume Slider & Mute
    if (volumeSlider) {
        volumeSlider.value = savedVolume * 100;
        audio.volume = savedVolume;

        volumeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) / 100;
            audio.volume = val;
            localStorage.setItem('sixhen_music_volume', val);
            if (muteIcon) {
                muteIcon.className = val === 0 ? 'fas fa-volume-mute' : (val < 0.5 ? 'fas fa-volume-down' : 'fas fa-volume-up');
            }
        });
    }

    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            if (audio.volume > 0) {
                audio.dataset.prevVol = audio.volume;
                audio.volume = 0;
                if (volumeSlider) volumeSlider.value = 0;
                if (muteIcon) muteIcon.className = 'fas fa-volume-mute';
            } else {
                const prev = parseFloat(audio.dataset.prevVol || '0.7');
                audio.volume = prev;
                if (volumeSlider) volumeSlider.value = prev * 100;
                if (muteIcon) muteIcon.className = prev < 0.5 ? 'fas fa-volume-down' : 'fas fa-volume-up';
            }
        });
    }

    window.sixhenMusic = {
        togglePlay,
        nextTrack,
        prevTrack,
        isPlaying: () => isPlaying
    };

    loadTrack(0, false);
})();
