<script>
export default {
  name: 'Firewall',
  data() {
    let interfaces = [];
    let rules = [];
    let newRule = {
      source: '',
      destination: '',
      protocol: '',
      target: '',
    };
    return { interfaces, rules, newRule };
  },
  methods: {
    getInterfaces() {
      this.api.getInterfaces().then((interfaces) => {
        this.interfaces = interfaces;
      })
        .catch((err) => {
          alert(err.message || err.toString());
        })
    },
    getRules() {
      this.api.getRules().then((rules) => {
        this.rules = rules;
      })
        .catch((err) => {
          alert(err.message || err.toString());
        })
    },
    addRule(e) {
      e.preventDefault();

      const { source, destination, protocol, target } = this.newRule;
      this.api.addRule({ source, destination, protocol, target }).then(() => {
        this.getRules();
      }).then(() => {
        this.newRule = {
          source: '',
          destination: '',
          protocol: '',
          target: '',
        };
      }).catch((err) => {
        alert(err.message || err.toString());
      });
    },
    deleteRule(num) {
      this.api.deleteRule({ num }).then(() => {
        this.getRules();
      }).catch((err) => {
        alert(err.message || err.toString());
      });
    },
  },
  mounted() {
    this.api = new API();
    this.getInterfaces();
    this.getRules();
  }
}
</script>

<template>
  <div class="shadow-md rounded-lg bg-white dark:bg-neutral-700 overflow-hidden">
    <div class="flex flex-row flex-auto items-center mb-4 p-3 px-5 border-b-2 border-gray-100 dark:border-neutral-600">
      <div class="flex-grow">
        <p class="text-2xl font-medium dark:text-neutral-200">{{ $t("fwFirewall") }}</p>
      </div>
    </div>

    <table class="table-auto w-[70%] dark:text-neutral-200 mb-4">
      <thead>
        <tr>
          <th>{{ $t('fwInterface') }}</th>
          <th>{{ $t('fwIv4') }}</th>
          <th>{{ $t('fwIv6') }}</th>
        </tr>
      </thead>
      <tbody class="text-center">
        <tr v-for="(iface, index) in interfaces" :key="index">
          <td>{{ iface.name }}</td>
          <td>{{ iface.ipv4 }}</td>
          <td>{{ iface.ipv6 }}</td>
        </tr>
      </tbody>
    </table>

    <table class="table-auto border-t-2 dark:border-neutral-200 w-full dark:text-neutral-200">
      <thead class="bg-gray-200 dark:bg-gray-600">
        <tr>
          <th>{{ $t('fwAction') }}</th>
          <th class="border-x-2 dark:border-neutral-200">{{ $t('fwSource') }}</th>
          <th class="border-x-2 dark:border-neutral-200">{{ $t('fwDestination') }}</th>
          <th class="border-x-2 dark:border-neutral-200">{{ $t('fwProtocol') }}</th>
          <th>{{ $t('fwTarget') }}</th>
        </tr>
      </thead>
      <tbody class="text-center">
        <tr v-for="(rule, index) in rules" :key="index">
          <td class="border border-gray-600 p-1 hover:bg-red-800 transition">
            <button @click="deleteRule(rule.num)">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor" class="size-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </td>
          <td class="border border-gray-600 p-1">{{ rule.source }}</td>
          <td class="border border-gray-600 p-1">{{ rule.destination }}</td>
          <td class="border border-gray-600 p-1">{{ rule.protocol }}</td>
          <td class="border border-gray-600 p-1">{{ rule.target }}</td>
        </tr>
        <tr>
          <td class="border border-gray-600 p-1 hover:bg-green-600 transition">
            <form id="fw" @submit="addRule">
              <button type="submit">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                  stroke="currentColor" class="size-6">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </button>
            </form>
          </td>
          <td class="border border-gray-600">
            <input form="fw" type="text" name="source" v-model="newRule.source"
              class="w-full outline-none bg-transparent text-center" />
          </td>
          <td class="border border-gray-600">
            <input form="fw" type="text" name="destination" v-model="newRule.destination"
              class="w-full outline-none bg-transparent text-center" />
          </td>
          <td class="border border-gray-600">
            <select form="fw" name="protocol" v-model="newRule.protocol" class="bg-transparent">
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
            </select>
          </td>
          <td class="border border-gray-600 p-1">
            <select form="fw" name="target" v-model="newRule.target" class="bg-transparent">
              <option value="ACCEPT">ALLOW</option>
              <option value="DROP">BLOCK</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
