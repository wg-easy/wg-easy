<template>
  <main>
    <Panel>
      <PanelHead>
        <PanelHeadTitle>
          {{ $t('pages.me') }}
        </PanelHeadTitle>
      </PanelHead>
      <PanelBody>
        <table>
          <tbody>
            <tr>
              <td>
                <Label
                  class="font-semibold dark:text-neutral-200"
                  for="username"
                >
                  {{ $t('username') }}
                </Label>
              </td>
              <td>
                <input id="username" v-model.trim="username" type="text" />
              </td>
            </tr>
            <tr>
              <td>
                <Label class="font-semibold dark:text-neutral-200" for="name">
                  {{ $t('name') }}
                </Label>
              </td>
              <td>
                <input id="name" v-model.trim="name" type="text" />
              </td>
            </tr>
            <tr>
              <td>
                <Label class="font-semibold dark:text-neutral-200" for="name">
                  {{ $t('email') }}
                </Label>
              </td>
              <td>
                <input id="name" v-model.trim="email" type="text" />
              </td>
            </tr>
            <tr colspan="2">
              <td>
                <BaseButton @click="submit">{{ $t('save') }}</BaseButton>
              </td>
            </tr>
            <tr>
              <td>
                <Label
                  class="font-semibold dark:text-neutral-200"
                  for="current-password"
                >
                  {{ $t('currentPassword') }}
                </Label>
              </td>
              <td>
                <input
                  id="current-password"
                  v-model.trim="currentPassword"
                  type="password"
                  autocomplete="current-password"
                />
              </td>
            </tr>
            <tr>
              <td>
                <Label
                  class="font-semibold dark:text-neutral-200"
                  for="new-password"
                >
                  {{ $t('setup.newPassword') }}
                </Label>
              </td>
              <td>
                <input
                  id="new-password"
                  v-model.trim="newPassword"
                  type="password"
                  autocomplete="new-password"
                />
              </td>
            </tr>

            <tr>
              <td>
                <Label
                  class="font-semibold dark:text-neutral-200"
                  for="confirm-password"
                >
                  {{ $t('confirmPassword') }}
                </Label>
              </td>
              <td>
                <input
                  id="confirm-password"
                  v-model.trim="confirmPassword"
                  type="password"
                  autocomplete="new-password"
                />
              </td>
            </tr>
            <tr colspan="2">
              <td>
                <BaseButton @click="updatePassword">{{
                  $t('updatePassword')
                }}</BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </PanelBody>
    </Panel>
  </main>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
authStore.update();

const username = ref(authStore.userData?.username);
const name = ref(authStore.userData?.name);
const email = ref(authStore.userData?.email);

const currentPassword = ref(authStore.userData?.email);
const newPassword = ref(authStore.userData?.email);
const confirmPassword = ref(authStore.userData?.email);

function submit() {}

function updatePassword() {}
</script>
