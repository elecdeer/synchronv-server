var express = require('express');
var router = express.Router();

var uuid = require('uuid');

const seekingTimeout = 5000;

var liveSession = {
  id: undefined,
  participants: [],
  isInSeekingOperation: false,
  seekingControlMessageCount: 0,
  seekingReadyToPlayCount: 0,
  seekingAutoPlay: false,
  seekingPosition: 0,
  //最後にcomplete_seekを発信した時刻。新規参加者のJoin時、再生位置を推定するのに使用。
  seekingCompletedTime: 0,
  //最後にシーク同期を開始した時刻。タイムアウトの判定に使用。
  seekingStartedTime: 0
};

liveSession.id = uuid.v4().split('-').join('');

//WebSocket setup

var http = require('http');
var server = http.createServer();
server.listen(5001);

const socketio = require('socket.io')(server);

socketio.on('connection', function (socket) {
  console.log("New client connected.");

  socket.on("disconnect", () => onSocketDisconnect(socket));

  socket.on("join", (data) => onSocketJoin(socket, data));

  socket.on("request_seek", (data) => onSocketRequestSeek(socket, data));

  socket.on("ready_to_play", (data) => onSocketReadyToPlay(socket, data));

  socket.on("get_seek", (data) => onSocketGetSeek(socket, data));

});

//参加者管理

//join
//新規参加者のJoin
function onSocketJoin(socket, data) {

  console.log("New participant joined.");
  //セッションIDのチェック
  //クライアント切断後→再接続して、切断前のセッションIDを保持してる場合、セッションIDが違えば応答しない（動画URLなど変化している可能性があるため）
  if (data.session_id !== void 0 && data.session_id != liveSession.id) {
    console.log("Invalid session ID.");
    return;
  }

  var participant = liveSession.participants.find(p => p.socket == socket);
  if (participant === void 0) {
    //未参加
    participant = {
      socket: socket,
      readyToPlay: false,
      needToWaitForReadyToPlay: false
    };
    liveSession.participants.push(participant);

    console.log("Participant registered.");
    console.log(liveSession);
    notifyParticipantsChanged();


  } else {
    //すでに参加中
    console.log("This participant has already joined.");
  }
}

//get_seek
function onSocketGetSeek(socket, data) {

  console.log("get_seek requested.");
  //セッションIDのチェック
  if (data.session_id !== void 0 && data.session_id != liveSession.id) {
    console.log("Invalid session ID.");
    return;
  }

  console.log("liveSession.seekingAutoPlay: " + liveSession.seekingAutoPlay);
  //シーク位置の通知
  if (liveSession.isInSeekingOperation) {
    //すでにシーク操作中の場合、新規socketにcontrol_seekを流す？
    //ready_to_playが返るまでほかのClientも待つことになるが……
    participant.socket.emit("control_seek",
      {
        session_id: liveSession.id,
        position: liveSession.seekingPosition,
      });

  } else {
    //再生中の場合、notify_seekを応答（無理にほかのClientと同期はとらない）
    //現在位置を算出
    var passed = (Date.now() - liveSession.seekingCompletedTime) * 0.001;

    if (liveSession.seekingAutoPlay) {
      //再生中
      socket.emit("notify_seek", {
        session_id: liveSession.id,
        is_playing: true,
        position: liveSession.seekingPosition + passed
      });
    } else {
      //停止中
      socket.emit("notify_seek", {
        session_id: liveSession.id,
        is_playing: true,
        position: liveSession.seekingPosition
      });
    }

  }
}

//disconnect
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
  liveSession.participants.forEach((participant, index) => {
    participant.socket.emit('participants_changed',
      {
        session_id: liveSession.id,
        count: liveSession.participants.length
      });
  });
}

//シーク同期

function onSocketRequestSeek(socket, data) {
  console.log("New seekng request has been received.");
  //セッションIDのチェック
  if (data.session_id != liveSession.id) {
    console.log("Invalid session ID.");
    return;
  }
  startSeek(data.position, data.autoplay);
}

function startSeek(position, autoplay) {

  if (liveSession.isInSeekingOperation) {
    //別のシークリクエストの処理中は弾く
    console.log("There is another seeking request being processed.");
    return;
  }

  liveSession.isInSeekingOperation = true;
  liveSession.seekingAutoPlay = autoplay;
  liveSession.seekingPosition = position;

  liveSession.participants.forEach((participant, index) => {
    participant.readyToPlay = false;
    participant.needToWaitForReadyToPlay = true;
    participant.socket.emit("control_seek",
      {
        session_id: liveSession.id,
        position: position
      });
  });

  //タイムアウトの設定
  liveSession.seekingStartedTime = Date.now();
  setTimeout(() => {
    if (Date.now() - liveSession.seekingStartedTime >= seekingTimeout) {
      completeSeek();
    }
  }, seekingTimeout + 100)

  console.log(liveSession.participants.length + " control_request have been sent. autoplay: " + autoplay);
}

function onSocketReadyToPlay(socket, data) {
  //セッションIDのチェック
  if (data.session_id != liveSession.id) {
    console.log("Invalid session ID.");
    return;
  }

  //シーク同期処理中でなければ弾く
  if (!liveSession.isInSeekingOperation) return;

  var participant = liveSession.participants.find((p) => p.socket == socket);
  if (participant === void 0) return;

  participant.readyToPlay = true;

  var needToWaitForReadyToPlayCount = liveSession.participants.filter((participant) => participant.needToWaitForReadyToPlay).length;
  var readyToPlayCount = 0;
  liveSession.participants.forEach((participant, index) => {
    if (participant.readyToPlay) readyToPlayCount++;
  });

  console.log("Ready to play: " + readyToPlayCount + "/" + needToWaitForReadyToPlayCount);

  //control_seekを行った全クライアントがready_to_playを返した
  if (readyToPlayCount == needToWaitForReadyToPlayCount) {
    completeSeek();
  }
}

function completeSeek() {
  //シーク同期処理中でなければ弾く
  if (!liveSession.isInSeekingOperation) return;

  liveSession.isInSeekingOperation = false;
  liveSession.seekingCompletedTime = Date.now();
  console.log("Broadcast complete_seek. autoplay: " + liveSession.seekingAutoPlay);
  liveSession.participants.forEach((participant, index) => {
    participant.socket.emit("complete_seek",
      {
        session_id: liveSession.id,
        autoplay: liveSession.seekingAutoPlay
      });
  });
}

module.exports = router;
