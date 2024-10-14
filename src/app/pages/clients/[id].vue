<template>
  <main v-if="data">
    <Panel>
      <PanelHead>
        <PanelHeadTitle :text="data.name" />
      </PanelHead>
      <PanelBody>
        <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <h4 class="text-2xl col-span-full py-6">
            {{ $t('me.sectionGeneral') }}
          </h4>
          <Label for="name" class="font-semibold md:align-middle md:leading-10">
            {{ 'Name' }}
          </Label>
          <input
            id="name"
            v-model.trim="data.name"
            type="text"
            class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
          />
          <Label
            for="enabled"
            class="font-semibold md:align-middle md:leading-10"
          >
            {{ 'Enabled' }}
          </Label>
          <input
            id="enabled"
            v-model.trim="data.enabled"
            type="checkbox"
            class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
          />
        </section>
        <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <h4 class="text-2xl col-span-full py-6">
            {{ 'Address' }}
          </h4>
          <Label for="ipv4" class="font-semibold md:align-middle md:leading-10">
            {{ 'IPv4' }}
          </Label>
          <input
            id="ipv4"
            v-model.trim="data.address4"
            type="text"
            class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
          />
          <Label for="ipv6" class="font-semibold md:align-middle md:leading-10">
            {{ 'IPv6' }}
          </Label>
          <input
            id="ipv6"
            v-model.trim="data.address6"
            type="text"
            class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
          />
        </section>
        <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <h4 class="text-2xl col-span-full py-6">
            {{ 'Advanced' }}
          </h4>
          <Label
            for="keepalive"
            class="font-semibold md:align-middle md:leading-10"
          >
            {{ 'Persistent Keepalive' }}
          </Label>
          <input
            id="keepalive"
            v-model.number="data.persistentKeepalive"
            type="number"
            class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
          />
        </section>
        <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <h4 class="text-2xl col-span-full py-6">
            {{ 'Action' }}
          </h4>
          <Label
            for="rotateprivkey"
            class="font-semibold md:align-middle md:leading-10"
          >
            {{ 'Rotate Private Key' }}
          </Label>
          <input
            id="rotateprivkey"
            value="Do !"
            type="button"
            class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
          />
          <Label
            for="delete"
            class="font-semibold md:align-middle md:leading-10"
          >
            {{ 'Delete' }}
          </Label>
          <input
            id="delete"
            value="Do !"
            type="button"
            class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
          />
        </section>
      </PanelBody>
    </Panel>
  </main>
</template>

<script lang="ts" setup>
const route = useRoute();
const id = route.params.id as string;
const { data } = await useFetch(`/api/client/${id}`, { method: 'get' });
</script>
