export const useToast = defineStore('Toast', () => {
  type ToastInterface = {
    publish: (e: { title: string; message: string }) => void;
  };

  type ToastRef = Ref<null | ToastInterface>;

  const toast = ref<Ref<ToastRef> | null>(null);

  function setToast(toastInstance: ToastRef) {
    toast.value = toastInstance;
  }

  function showToast({
    title,
    message,
  }: {
    type: 'success' | 'error';
    title: string;
    message: string;
  }) {
    toast.value?.value?.publish({ title, message });
  }

  return { setToast, showToast };
});
