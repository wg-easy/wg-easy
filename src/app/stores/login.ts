type PendingLoginChallenge = {
  type: 'password';
  username: string;
  password: string;
  remember: boolean;
};

export const useLoginStore = defineStore('Login', () => {
  const pendingChallenge = ref<PendingLoginChallenge | null>(null);

  const hasPendingLogin = computed(() => pendingChallenge.value !== null);

  function setPendingPasswordLogin(
    username: string,
    password: string,
    remember: boolean
  ) {
    pendingChallenge.value = {
      type: 'password',
      username,
      password,
      remember,
    };
  }

  function clearPendingLogin() {
    pendingChallenge.value = null;
  }

  return {
    pendingChallenge,
    hasPendingLogin,
    setPendingPasswordLogin,
    clearPendingLogin,
  };
});
