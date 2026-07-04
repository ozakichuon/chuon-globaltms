"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, KeyRound, Users, X, RefreshCw } from "lucide-react";

type User = { id: string; must_change: boolean };

export function UserManagement() {
  const [newId, setNewId] = useState("");
  const [newPw, setNewPw] = useState("");
  const [addError, setAddError] = useState("");
  const [addOk, setAddOk] = useState(false);
  const [showList, setShowList] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [listError, setListError] = useState("");

  // パスワード変更用
  const [changingId, setChangingId] = useState<string | null>(null);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [changeError, setChangeError] = useState("");
  const [changeOk, setChangeOk] = useState(false);

  async function fetchUsers() {
    setListError("");
    try {
      const res = await fetch("/api/auth/change-password");
      const data = await res.json();
      if (!res.ok) { setListError(data.error); return; }
      setUsers(data.users);
    } catch {
      setListError("取得に失敗しました");
    }
  }

  function openList() {
    setShowList(true);
    fetchUsers();
  }

  async function addUser() {
    setAddError(""); setAddOk(false);
    if (!newId || !newPw) { setAddError("IDとパスワードを入力してください"); return; }
    const res = await fetch("/api/auth/change-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: newId, password: newPw }),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error); return; }
    setNewId(""); setNewPw(""); setAddOk(true);
    fetchUsers();
  }

  async function deleteUser(id: string) {
    if (!confirm(`ユーザー「${id}」を削除しますか？`)) return;
    const res = await fetch("/api/auth/change-password", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchUsers();
  }

  async function resetPassword(id: string) {
    if (!confirm(`「${id}」のパスワードを初期値「5211」にリセットしますか？`)) return;
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_id: id, new_password: "5211" }),
    });
    if (res.ok) fetchUsers();
  }

  async function changePassword() {
    setChangeError(""); setChangeOk(false);
    if (pw1 !== pw2) { setChangeError("新パスワードが一致しません"); return; }
    if (pw1.length < 4) { setChangeError("4文字以上にしてください"); return; }
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_id: changingId, new_password: pw1 }),
    });
    const data = await res.json();
    if (!res.ok) { setChangeError(data.error); return; }
    setChangingId(null); setPw1(""); setPw2(""); setChangeOk(true);
    fetchUsers();
  }

  return (
    <div className="mt-4 space-y-4">
      {/* ユーザー追加フォーム */}
      <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
        <div className="text-sm font-medium flex items-center gap-1">
          <Plus size={14} /> ユーザーを追加
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1">ログインID</label>
            <input type="text" value={newId} onChange={(e) => setNewId(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">初期パスワード</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        {addError && <p className="text-xs text-red-600">{addError}</p>}
        {addOk && <p className="text-xs text-emerald-600">✓ ユーザーを追加しました</p>}
        <div className="flex items-center gap-3">
          <button onClick={addUser}
            className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded text-sm transition-colors">
            追加する
          </button>
          <button onClick={openList}
            className="flex items-center gap-1.5 px-4 py-1.5 border border-slate-300 hover:bg-slate-100 rounded text-sm text-slate-700 transition-colors">
            <Users size={14} /> ユーザー一覧
          </button>
        </div>
      </div>

      {/* ユーザー一覧パネル */}
      {showList && (
        <div className="border rounded-lg bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50 rounded-t-lg">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Users size={15} /> ユーザー一覧
            </h4>
            <div className="flex items-center gap-2">
              <button onClick={fetchUsers}
                className="p-1 text-slate-400 hover:text-slate-700 transition-colors" title="更新">
                <RefreshCw size={14} />
              </button>
              <button onClick={() => { setShowList(false); setChangingId(null); }}
                className="p-1 text-slate-400 hover:text-slate-700 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {listError && (
            <div className="px-4 py-3 text-sm text-red-600">{listError}</div>
          )}

          <div className="divide-y">
            {users.map((u) => (
              <div key={u.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{u.id}</span>
                    {u.must_change && (
                      <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                        初回変更待ち
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setChangingId(u.id); setPw1(""); setPw2(""); setChangeError(""); setChangeOk(false); }}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors"
                    >
                      <KeyRound size={12} /> PW変更
                    </button>
                    <button
                      onClick={() => resetPassword(u.id)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600 transition-colors"
                    >
                      <RefreshCw size={12} /> PW初期化
                    </button>
                    {u.id !== "admin" && (
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={12} /> 削除
                      </button>
                    )}
                  </div>
                </div>

                {/* インラインPW変更フォーム */}
                {changingId === u.id && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">新パスワード</label>
                        <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">確認</label>
                        <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                    </div>
                    {changeError && <p className="text-xs text-red-600">{changeError}</p>}
                    <div className="flex gap-2">
                      <button onClick={changePassword}
                        className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs transition-colors">
                        変更する
                      </button>
                      <button onClick={() => setChangingId(null)}
                        className="px-3 py-1.5 border rounded text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {changeOk && (
            <div className="px-4 py-2 text-xs text-emerald-600 border-t bg-emerald-50">
              ✓ パスワードを変更しました
            </div>
          )}
        </div>
      )}
    </div>
  );
}
