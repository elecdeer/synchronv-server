// users.js
// ユーザー認証関連APIを実装

var express = require('express');
var router = express.Router();

var uuid = require('uuid');

//ルーティング

router.get('/show', function(req, res, next) {
  show(req, res);
});

router.post('/create_temporary', function(req, res, next) {
  create_temporary(req, res);
});


//各エンドポイント

function show(req, res)
{
  var user = getUser(req.query.id);
  if(user === void 0)
  {
    res.status(404).json({error: 'User not found'});

  }
  res.status(200).json(user);
}

function create_temporary(req, res)
{
  var id = uuid.v4().split('-').join('');
  var screen_name = req.body.screen_name;
  var profile_image_url = req.body.profile_image_url;

  var user = 
  {
    id: id,
    screen_name: screen_name,
    profile_image_url, profile_image_url
  }

  addUser(user);
  res.status(200).json(user);
  //TODO: セッションに認証情報の保存

}

//ユーザーエントリの操作関連（ゆくゆくDB対応するとしてひとまずObjectをラップ）

var _users = []

function getUser(id)
{
  return _users.find((user) => user.id == id);
}

function addUser(userObj)
{
  _users.push(userObj);
  return true;
}

function updateUser(id, userObj)
{
  var userIndex = _users.findIndex((user) => user.id == id);
  if(userIndex == -1) return false;
  _users.splice(userIndex, 1);
  addUser(userObj);
  return true;
}

module.exports = router;
