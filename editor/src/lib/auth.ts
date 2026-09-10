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

export async function login(identity: string, password: string) {
  await pb.collection('editors').authWithPassword(identity, password);
}
