<template>
  <main v-if="data">
    <FormElement @submit.prevent="submit">
      <FormGroup>
        <FormHeading>Interface Settings</FormHeading>
        <FormNumberField id="mtu" v-model="data.mtu" label="MTU" />
        <FormNumberField id="port" v-model="data.port" label="Port" />
        <FormTextField id="device" v-model="data.device" label="Device" />
      </FormGroup>
      <FormGroup>
        <FormHeading>Actions</FormHeading>
        <FormActionField type="submit" label="Save" />
        <FormActionField label="Revert" @click="revert" />
        <AdminCidrDialog
          trigger-class="col-span-2"
          :ipv4-cidr="data.ipv4Cidr"
          :ipv6-cidr="data.ipv6Cidr"
          @change="changeCidr"
        >
          <FormActionField label="Change CIDR" class="w-full" />
        </AdminCidrDialog>
      </FormGroup>
    </FormElement>
  </main>
</template>

<script setup lang="ts">
const toast = useToast();

const { data: _data, refresh } = await useFetch(`/api/admin/interface`, {
  method: 'get',
});

const data = toRef(_data.value);

async function submit() {
  try {
    const res = await $fetch(`/api/admin/interface`, {
      method: 'post',
      body: data.value,
    });
    toast.showToast({
      type: 'success',
      title: 'Success',
      message: 'Saved',
    });
    if (!res.success) {
      throw new Error('Failed to save');
    }
    await refreshNuxtData();
  } catch (e) {
    if (e instanceof Error) {
      toast.showToast({
        type: 'error',
        title: 'Error',
        message: e.message,
      });
    }
  }
}

async function revert() {
  await refresh();
  data.value = toRef(_data.value).value;
}

async function changeCidr(ipv4Cidr: string, ipv6Cidr: string) {
  try {
    const res = await $fetch(`/api/admin/interface/cidr`, {
      method: 'post',
      body: { ipv4Cidr, ipv6Cidr },
    });
    toast.showToast({
      type: 'success',
      title: 'Success',
      message: 'Changed CIDR',
    });
    if (!res.success) {
      throw new Error('Failed to change CIDR');
    }
    await refreshNuxtData();
  } catch (e) {
    if (e instanceof Error) {
      toast.showToast({
        type: 'error',
        title: 'Error',
        message: e.message,
      });
    }
  }
}
</script>
