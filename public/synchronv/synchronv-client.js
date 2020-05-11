
function Synchronv(socketHost, video) {

    //socket setup
    var socket = io(socketHost)
    this.socket = socket;

    this.sessionId = ""
    this._askingForSeekingPosition = false;

    socket.on('connect', () => {
        console.log('connect');
        var joinData = {};
        if (this.sessionId != "") joinData.session_id = this.sessionId;
        socket.emit('join', joinData);
    });

    socket.on('participants_changed', (data) => {
        console.log("participants_changed");
        console.log(data);

        if (this.sessionId == "") {
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
        //this.sessionId = "";
    });

    //video control setup

    this.video = video;
    this.isSeeking = false;
    this.isInSeekingOperation = false;
    this.sessionId = "";

    video.addEventListener("seeked", () => {
        if (this.isInSeekingOperation && this.isSeeking) {
            this.isSeeking = false;
            this.socket.emit('ready_to_play', {
                session_id: this.sessionId
            });
        }
    });

    socket.on('control_seek', (data) => {
        console.log("control_seek");
        if (!this.isSeeking) {
            this._beginSeekingOperation();
            this.isSeeking = true;
            this.video.pause();
            this.video.currentTime = data.position;
        }
    });

    socket.on('complete_seek', (data) => {
        console.log("complete_seek");
        console.log("autoplay: " + data.autoplay);
        if (this.isInSeekingOperation) {
            this._endSeekingOperation();
            this.isSeeking = false;
            if (data.autoplay) {
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
            autoplay: true
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
            autoplay: false
        });
    }
}

Synchronv.prototype.sendSeek = function (position) {
    if (!this.isInSeekingOperation) {
        this._beginSeekingOperation();
        let autoplay = !video.paused;
        this.video.pause();
        this.socket.emit('request_seek', {
            session_id: this.sessionId,
            position: position,
            autoplay: autoplay
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