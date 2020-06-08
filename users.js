const unknownUser = {
    id: "unknown",
    screen_name: "unknown",
    profile_image_url: ""
  }

//ユーザーエントリの操作関連（ゆくゆくDB対応するとしてひとまずObjectをラップ）

function Users()
{
    this._users = []
}

Users.prototype.getUser = function(id) {
  return this._users.find((user) => user.user_obj.id == id).user_obj;
}

// セッションから認証済みのUser Objectを取得する。認証できない場合はunknown userを返す
Users.prototype.getAuthorizedUser = function(session)
{
  const entry = this._users.find((user) => user.user_obj.id == session.user_id);
  if(entry === void 0) return unknownUser;
  if(entry.authentication.key == session.auth_key)
  {
    return entry.user_obj;
  }
  return unknownUser;
}

Users.prototype.addUser = function(userObj, authKey) {
    this._users.push(
    {
      authentication: {key: authKey},
      user_obj: userObj
    }
  );
  return true;
}

Users.prototype.updateUser = function(id, userObj) {
  const userIndex = this._users.findIndex((user) => user.user_obj.id == id);
  if (userIndex == -1) return false;
  this._users[userIndex].user_obj = userObj;
  return true;
}

module.exports = new Users();