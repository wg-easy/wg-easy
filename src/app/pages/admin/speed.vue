<template>
  <main v-if="data">
    <div>
      <!-- Header -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-neutral-100">
          {{ $t('admin.speed.title') }}
        </h2>
        <div class="flex flex-wrap gap-3">
          <button role="button" class="inline-flex items-center rounded border-2 border-gray-100 px-4 py-2 text-gray-700 transition hover:border-red-800 hover:bg-red-800 hover:text-white dark:border-neutral-600 dark:text-neutral-200" @click="refresh">
            {{ $t('admin.speed.refresh') }}
          </button>
          <button role="button" class="inline-flex items-center rounded border-2 border-red-800 bg-red-800 px-4 py-2 text-white transition hover:border-red-600 hover:bg-red-600 inline-flex items-center gap-2" @click="applyConfig">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
            </svg>
            {{ $t('admin.speed.apply') }}
          </button>
        </div>
      </div>

      <!-- Global Settings -->
      <div class="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-neutral-600 dark:bg-neutral-800 sm:grid-cols-2">
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            {{ $t('admin.speed.totalBandwidth') }}
          </label>
          <div class="flex items-center gap-3">
            <input
              v-model.number="data.tcState.totalUlRate"
              type="number"
              min="1"
              max="10000"
              class="w-32 rounded-lg border-2 border-gray-100 text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400"
            >
            <span class="text-sm text-gray-500 dark:text-neutral-400">Mbit</span>
            <span class="ml-2 hidden text-xs text-gray-400 dark:text-neutral-500 lg:inline">
              {{ $t('admin.speed.totalBandwidthDesc') }}
            </span>
          </div>
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            {{ $t('admin.speed.defaultClassId') }}
          </label>
          <div class="flex items-center gap-3">
            <input
              v-model.number="data.tcState.defaultClassId"
              type="number"
              min="1"
              max="255"
              class="w-32 rounded-lg border-2 border-gray-100 text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400"
            >
            <span class="text-xs text-gray-400 dark:text-neutral-500">
              {{ $t('admin.speed.defaultClassIdDesc') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Class Cards Grid -->
      <div class="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <!-- Unassigned Clients -->
        <div class="flex flex-col">
          <div class="mb-3 rounded-lg bg-orange-50 px-4 py-2 text-center text-sm font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
            {{ $t('admin.speed.unassigned') }}
          </div>
          <div class="flex-1 rounded-lg border-2 border-dashed border-orange-200 bg-orange-50/30 p-3 dark:border-orange-800 dark:bg-orange-950/20">
            <div
              v-for="client in unassignedClients"
              :key="client.id"
              class="mb-2 cursor-grab rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:shadow-md active:cursor-grabbing dark:border-orange-700 dark:bg-neutral-700"
              draggable="true"
              @dragstart="onDragStart(client, null)"
            >
              <div class="font-medium text-gray-800 dark:text-neutral-100">{{ client.name }}</div>
              <div class="text-xs text-gray-500 dark:text-neutral-400">{{ client.ipv4Address }}</div>
            </div>
            <div v-if="unassignedClients.length === 0" class="text-center text-xs text-gray-400 dark:text-neutral-500 py-4">
              {{ $t('admin.speed.noUnassigned') }}
            </div>
          </div>
        </div>

        <!-- Class Cards -->
        <div
          v-for="(cls, index) in data.tcState.classes"
          :key="cls.id"
          class="flex flex-col rounded-lg border border-gray-200 p-3 dark:border-neutral-600"
        >
          <div class="mb-3 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2 dark:bg-blue-900/30">
            <span class="text-sm font-medium text-blue-800 dark:text-blue-200">
              {{ cls.ulRate }} Mbit
            </span>
            <button
              class="text-red-500 transition hover:text-red-700 dark:text-red-400"
              :title="$t('admin.speed.removeClass')"
              @click="removeClass(index)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div class="mb-2 flex items-center gap-2 px-1">
            <label class="text-xs text-gray-500 dark:text-neutral-400">UL:</label>
            <input
              v-model.number="cls.ulRate"
              type="number"
              min="1"
              class="w-full max-w-[5rem] rounded border border-gray-200 px-2 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
              @input="onClassUlChange(cls)"
            >
            <span class="text-xs text-gray-400">Mbit</span>
          </div>
          <div class="mb-2 px-1 text-xs text-gray-400 dark:text-neutral-500">
            LS: {{ Math.floor(cls.ulRate / 2) }} Mbit
          </div>
          <div
            class="flex-1 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 p-3 dark:border-blue-800 dark:bg-blue-950/20"
            @dragover.prevent
            @drop="onDrop(index)"
          >
            <div
              v-for="client in getClientsForClass(cls)"
              :key="client.ipv4Address"
              class="mb-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:shadow-md dark:border-blue-700 dark:bg-neutral-700"
              draggable="true"
              @dragstart="onDragStart(client, index)"
            >
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium text-gray-800 dark:text-neutral-100">{{ client.name }}</div>
                  <div class="text-xs text-gray-500 dark:text-neutral-400">{{ client.ipv4Address }}</div>
                </div>
                <button
                  class="text-gray-400 transition hover:text-red-500"
                  :title="$t('admin.speed.moveToUnassigned')"
                  @click="moveToUnassigned(client.ipv4Address, index)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div v-if="cls.clientIps.length === 0" class="text-center text-xs text-gray-400 dark:text-neutral-500 py-4">
              {{ $t('admin.speed.dropHere') }}
            </div>
          </div>
        </div>

        <!-- Add Class Card -->
        <div class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 dark:border-neutral-600">
          <button
            class="inline-flex items-center rounded bg-red-800 px-4 py-2 text-sm text-white transition hover:bg-red-600"
            @click="addClass"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {{ $t('admin.speed.addClass') }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
const { t } = useI18n();
const toast = useToast();

type TcClient = {
  id: string | number;
  name: string;
  ipv4Address: string;
  enabled: boolean;
};

type TcClass = {
  id: number;
  ulRate: number;
  clientIps: string[];
};

type TcStateResponse = {
  clients: TcClient[];
  tcState: {
    totalUlRate: number;
    defaultClassId: number;
    classes: TcClass[];
  };
};

const { data: fetchData, refresh: _refresh } = await useFetch<TcStateResponse>('/api/tc/state', {
  method: 'get',
});

// Use a ref instead of computed for stable reactivity
const data = ref<TcStateResponse | null>(null);

// Initialize from fetch data
watch(fetchData, (val) => {
  if (val) {
    data.value = JSON.parse(JSON.stringify(val));
  }
}, { immediate: true });

// Computed: clients not assigned to any class
const unassignedClients = computed(() => {
  if (!data.value) return [];
  const assignedIps = new Set<string>();
  for (const cls of data.value.tcState.classes) {
    for (const ip of cls.clientIps) {
      assignedIps.add(ip);
    }
  }
  return data.value.clients.filter((c) => c.ipv4Address && !assignedIps.has(c.ipv4Address));
});

// Get clients for a given class
function getClientsForClass(cls: TcClass): TcClient[] {
  if (!data.value) return [];
  const ipSet = new Set(cls.clientIps);
  return data.value.clients.filter((c) => c.ipv4Address && ipSet.has(c.ipv4Address));
}

// Drag state
const dragState = ref<{ client: TcClient; fromClassIdx: number | null } | null>(null);

function onDragStart(client: TcClient, fromClassIdx: number | null) {
  dragState.value = { client, fromClassIdx };
}

function onDrop(toClassIdx: number) {
  if (!dragState.value || !data.value) return;
  const { client, fromClassIdx } = dragState.value;

  // Remove IP from source
  if (fromClassIdx !== null) {
    const srcClass = data.value.tcState.classes[fromClassIdx];
    if (srcClass) {
      srcClass.clientIps = srcClass.clientIps.filter((ip) => ip !== client.ipv4Address);
    }
  }

  // Add IP to target
  const dstClass = data.value.tcState.classes[toClassIdx];
  if (dstClass && client.ipv4Address && !dstClass.clientIps.includes(client.ipv4Address)) {
    dstClass.clientIps.push(client.ipv4Address);
  }

  dragState.value = null;
}

function moveToUnassigned(ip: string, classIdx: number) {
  if (!data.value) return;
  const cls = data.value.tcState.classes[classIdx];
  if (cls) {
    cls.clientIps = cls.clientIps.filter((i) => i !== ip);
  }
}

function onClassUlChange(cls: TcClass) {
  // Auto-generate class ID as 1{UL} (e.g. UL=3 → ID=13)
  const ulStr = String(cls.ulRate);
  const newId = parseInt('1' + ulStr, 10);
  if (!isNaN(newId) && newId >= 10) {
    // Only update if the new ID doesn't conflict with existing classes
    const conflict = data.value?.tcState.classes.find((c) => c.id === newId && c !== cls);
    if (!conflict) {
      cls.id = newId;
    }
  }
}

function removeClass(index: number) {
  if (!data.value) return;
  data.value.tcState.classes.splice(index, 1);
}

function addClass() {
  if (!data.value) return;
  let newUl = 5;
  const existingIds = new Set(data.value.tcState.classes.map((c) => c.id));
  let newId: number;
  do {
    const s = String(newUl);
    newId = parseInt('1' + s, 10);
    if (existingIds.has(newId)) {
      newUl++;
    } else {
      break;
    }
  } while (true);

  data.value.tcState.classes.push({
    id: newId,
    ulRate: newUl,
    clientIps: [],
  });

  // Re-sort by UL rate
  data.value.tcState.classes.sort((a, b) => a.ulRate - b.ulRate);
}

async function refresh() {
  await _refresh();
  if (fetchData.value) {
    data.value = JSON.parse(JSON.stringify(fetchData.value));
  }
}

async function applyConfig() {
  if (!data.value) return;

  try {
    const res = await $fetch('/api/tc/state', {
      method: 'post',
      body: data.value.tcState,
    });

    if (res.success) {
      toast.showToast({
        type: 'success',
        message: res.message || t('admin.speed.applySuccess'),
      });
    } else {
      toast.showToast({
        type: 'error',
        message: res.message || t('admin.speed.applyError'),
      });
    }
  } catch (e: any) {
    toast.showToast({
      type: 'error',
      message: e?.data?.message || e?.message || t('admin.speed.applyError'),
    });
  }

  await refresh();
}
</script>