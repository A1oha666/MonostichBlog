import { useSyncExternalStore } from 'react';
import { pb } from './pb';

// 订阅 PocketBase authStore：token 变化（登录/退出/401 清空）即触发重渲染。
function subscribe(cb: () => void) {
  // pocketbase SDK 的 onChange 返回取消订阅函数
  return pb.authStore.onChange(cb);
}

export function useAuth() {
  const isValid = useSyncExternalStore(subscribe, () => pb.authStore.isValid);
  const email = useSyncExternalStore(subscribe, () => pb.authStore.record?.email ?? '');
  return { isLoggedIn: isValid, email };
}

export function logout() {
  pb.authStore.clear();
}

// 先试 editors 集合（日常写作账号），失败后回退 _superusers（后台管理员）。
// superuser 在 PocketBase 规则里天然放行（articles 的 create/update 规则
// 为 null 时仅 superuser 可写；规则表达式对 superuser 也直接通过），
// 因此同一套编辑器 UI 两种身份都能用。
export async function login(identity: string, password: string) {
  try {
    await pb.collection('editors').authWithPassword(identity, password);
  } catch (editorsErr: any) {
    // editors 失败（账号不存在 / 密码错误 / 集合缺失）再试 superuser；
    // 两个都失败时抛 superuser 的错误信息，更能反映“账号密码不对”本身
    try {
      await pb.collection('_superusers').authWithPassword(identity, password);
    } catch (superErr: any) {
      throw new Error(
        superErr?.response?.message ??
          editorsErr?.response?.message ??
          '身份或密码错误',
      );
    }
  }
}
