
function Synchronv(socketHost) {

    var socket = io(socketHost)
    this.socket = socket;

    socket.on('connect', () => {
        console.log('connect');
        socket.emit('join', {});
    });

    socket.on('participants_changed', (data) => {
        console.log("participants_changed");
        console.log(data);
        if (this._onParticipantsChanged !== void 0)
            this._onParticipantsChanged(data.count);
    });

    socket.on('disconnect', () => {
        console.log('disconnected');
    });
}

Synchronv.prototype.onParticipantsChanged = function (callback) {
    this._onParticipantsChanged = callback;
}