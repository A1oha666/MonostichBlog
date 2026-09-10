import { useState } from 'react';
import { login } from '../lib/auth';

export function LoginDialog() {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(identity.trim(), password);
    } catch (err: any) {
      setError(`登录失败：${err?.message ?? '邮箱或密码错误'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-overlay">
      <form className="login-card" onSubmit={submit}>
        <h1>Monostich 编辑器</h1>
        <p className="login-sub">editors 账号或后台管理员账号均可登录</p>
        <label>
          邮箱
          <input
            type="email"
            autoComplete="username"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          密码
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div className="login-error">{error}</div>}
        <button type="submit" disabled={busy}>
          {busy ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  );
}
