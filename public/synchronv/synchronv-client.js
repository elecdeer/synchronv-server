
function Synchronv(socketHost, video) {

    //socket setup
    var socket = io(socketHost)
    this.socket = socket;

    this.sessionId = ''
    this._askingForSeekingPosition = false;

    socket.on('connect', () => {
        console.log('connect');
        var joinData = {};
        if (this.sessionId != '') joinData.session_id = this.sessionId;
        socket.emit('join', joinData);
    });

    socket.on('participants_changed', (data) => {
        console.log('participants_changed');
        console.log(data);

        if (this.sessionId == '') {
            this.sessionId = data.session_id;
            this.socket.emit('get_seek', {
                session_id: this.sessionId
            });
            this._askingForSeekingPosition = true;
        }

        if (this._onParticipantsChanged !== void 0)
            this._onParticipantsChanged(data.count);
    });

    socket.on('notify_seek', (data) => {
        if (!this._askingForSeekingPosition) return;
        console.log(data);
        this._askingForSeekingPosition = false;
        if (data.is_playing) {
            this.video.play();
        } else {
            this.video.pause();
        }

        this.video.currentTime = data.position;
    });

    socket.on('disconnect', () => {
        console.log('disconnected');
        //this.sessionId = '';
    });

    //video control setup

    this.video = video;
    this.isSeeking = false;
    this.isInSeekingOperation = false;
    this.sessionId = '';

    video.addEventListener('seeked', () => {
        if (this.isInSeekingOperation && this.isSeeking) {
            this.isSeeking = false;
            this.socket.emit('ready_to_play', {
                session_id: this.sessionId
            });
        }
    });

    socket.on('control_seek', (data) => {
        console.log('control_seek');
        console.log(data.seek_type + ' by ' + data.requested_by.screen_name);
        if (!this.isSeeking) {
            this._beginSeekingOperation();
            this.isSeeking = true;
            this.video.pause();
            this.video.currentTime = data.position;
        }
    });

    socket.on('complete_seek', (data) => {
        console.log('complete_seek');
        console.log(data);
        console.log('seek_type: ' + data.seek_type);
        if (this.isInSeekingOperation) {
            this._endSeekingOperation();
            this.isSeeking = false;
            this.video.playbackRate = data.playback_speed;
            if (data.seek_type == 'play' || data.seek_type == 'seek_play') {
                this.video.play();
            }
        }
    });
}

Synchronv.prototype.onParticipantsChanged = function (callback) {
    this._onParticipantsChanged = callback;
}

Synchronv.prototype.sendPlay = function () {
    if (!this.isInSeekingOperation) {
        this._beginSeekingOperation();
        this.video.pause();
        this.socket.emit('request_seek', {
            session_id: this.sessionId,
            position: this.video.currentTime,
            seek_type: 'play'
        });
    }
}

Synchronv.prototype.sendPause = function () {
    if (!this.isInSeekingOperation) {
        this._beginSeekingOperation();
        this.video.pause();
        this.socket.emit('request_seek', {
            session_id: this.sessionId,
            position: this.video.currentTime,
            seek_type: 'pause'
        });
    }
}

Synchronv.prototype.sendSeek = function (position, playbackSpeed) {
    if (!this.isInSeekingOperation) {
        this._beginSeekingOperation();
        var seekType = (video.paused ? 'seek_pause' : 'seek_play');
        this.video.pause();
        this.socket.emit('request_seek', {
            session_id: this.sessionId,
            position: position,
            seek_type: seekType,
            playback_speed: playbackSpeed
        });
    }
}

Synchronv.prototype._beginSeekingOperation = function () {
    this.isInSeekingOperation = true;
    if (this.onOperationStateChanged !== void 0)
        this.onOperationStateChanged(false);
}
Synchronv.prototype._endSeekingOperation = function () {
    this.isInSeekingOperation = false;
    if (this.onOperationStateChanged !== void 0)
        this.onOperationStateChanged(true);
}