export const useToast = defineStore('Toast', () => {
  const { t: $t } = useI18n();

  type ToastInterface = {
    publish: (e: ToastParams) => void;
  };

  type ToastRef = Ref<null | ToastInterface>;

  const toast = ref<Ref<ToastRef> | null>(null);

  function setToast(toastInstance: ToastRef) {
    toast.value = toastInstance;
  }

  type ShowToast =
    | {
        type: 'success';
        title?: string;
        message?: string;
      }
    | {
        type: 'error';
        title?: string;
        message: string;
      };

  function showToast({ type, title, message }: ShowToast) {
    if (type === 'success') {
      if (!title) {
        title = $t('common.notifications.success');
      }
      if (!message) {
        message = $t('common.notifications.saved');
      }
    } else if (type === 'error') {
      if (!title) {
        title = $t('common.notifications.error');
      }
    }
    toast.value?.value?.publish({
      type,
      title: title ?? '',
      message: message ?? '',
    });
  }

  return { setToast, showToast };
});
