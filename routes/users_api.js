// users.js
// ユーザー認証関連APIを実装

const express = require('express');
const app = express();
const router = express.Router();

const uuid = require('uuid');

const users = require('../users');



//ルーティング

router.get('/show', function (req, res, next) {
  show(req, res);
});

router.post('/create_temporary', function (req, res, next) {
  create_temporary(req, res);
});


//各エンドポイント

function show(req, res) {
  const user = users.getUser(req.query.id);
  if (user === void 0) {
    res.status(404).json({ error: 'User not found' });

  }
  res.status(200).json(user);
}

function create_temporary(req, res) {
  const id = uuid.v4().split('-').join('');
  const screen_name = req.body.screen_name;
  const profile_image_url = req.body.profile_image_url;

  const user =
  {
    id: id,
    screen_name: screen_name,
    profile_image_url, profile_image_url
  }
  
  console.log(user);

  const authKey = uuid.v4().split('-').join('');

  users.addUser(user, authKey);
  req.session.user_id = id;
  req.session.auth_key = authKey;
  res.status(200).json(user);
  

}
module.exports = router;
