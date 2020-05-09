var express = require('express');
var router = express.Router();

var uuid = require('uuid');

var liveSession = {
  id: undefined,
  participants: []
};

liveSession.id = uuid.v4().split('-').join('');

/*
router.get('/test', function (req, res, next) {
  res.render('live/test', { live_session: liveSession });
});
*/

//WebSocket setup

var http = require('http');
var server = http.createServer();
server.listen(5001);

const socketio = require('socket.io')(server);

socketio.on('connection', function (socket) {
  console.log("New client connected.");

  socket.on("disconnect", () => onSocketDisconnect(socket));

  socket.on("join", () => onSocketJoin(socket));

});

function onSocketJoin(socket, data) {

  console.log("New participant joined.");

  var participant = liveSession.participants.find(p => p.socket == socket);
  if (participant === void 0) {
    console.log("Participant registered.");
    //未参加
    participant = {
      socket: socket
    };
    liveSession.participants.push(participant);

    console.log(liveSession);
    notifyParticipantsChanged();
  } else {
    //すでに参加中
    console.log("This participant has already joined.");
  }
}

function onSocketDisconnect(socket) {

  console.log("Participant disconnected.");

  var participantIndex = liveSession.participants.findIndex(p => p.socket == socket);
  if (participantIndex == -1) {
    //未参加
    console.log("Participant not found.");
  } else {
    //すでに参加中
    console.log("Participant removed.");
    liveSession.participants.splice(participantIndex, 1);

    console.log(liveSession);
    notifyParticipantsChanged();
  }
}

function notifyParticipantsChanged() {
  socketio.emit('participants_changed',
    {
      session_id: liveSession.id,
      count: liveSession.participants.length
    });
}

module.exports = router;
