<!-- If you modify this file, run `(p)npm run buildfirewall` -->

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
        this.newRule = {
          source: '',
          destination: '',
          protocol: '',
          target: '',
        };
      }).catch((err) => {
        alert(err.message || err.toString());
      }).finally(() => {
        this.getRules();
      });
    },
    deleteRule(num) {
      this.api.deleteRule({ num }).catch((err) => {
        alert(err.message || err.toString());
      }).finally(() => {
        this.getRules();
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
  <div class="shadow-md rounded-lg bg-white dark:bg-neutral-700 overflow-hidden mb-4">
    <div class="flex flex-row flex-auto items-center p-3 px-5 border-b-2 border-neutral-500/50 dark:border-neutral-600">
      <div class="flex-grow">
        <p class="text-2xl font-medium dark:text-neutral-200">{{ $t('fwFirewall') }}</p>
      </div>
    </div>

    <div class="container p-2 flex flex-col md:items-center">
      <table class="border border-neutral-500/50 bg-gray-200/10 dark:text-neutral-200 md:w-[75%] mb-4">
        <thead>
          <tr>
            <th class="border border-neutral-500/50 text-start p-1">{{ $t('fwInterface') }}</th>
            <th class="border border-neutral-500/50 text-start p-1">{{ $t('fwIpv4') }}</th>
            <th class="border border-neutral-500/50 text-start p-1">{{ $t('fwIpv6') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(iface, index) in interfaces" :key="index">
            <td class="border border-neutral-500/50 p-1">{{ iface.name }}</td>
            <td class="border border-neutral-500/50 p-1">{{ iface.ipv4 }}</td>
            <td class="border border-neutral-500/50 p-1">{{ iface.ipv6 }}</td>
          </tr>
        </tbody>
      </table>

      <form id="fw" @submit="addRule"></form>

      <div class="overflow-x-auto">
        <table class=" dark:text-neutral-200 border-t-2 border-collapse dark:border-neutral-200 p-2">
          <thead class="bg-gray-200 dark:bg-neutral-600">
            <tr>
              <th class="border dark:border-neutral-200">{{ $t('fwAction') }}</th>
              <th class="border dark:border-neutral-200">{{ $t('fwSource') }}</th>
              <th class="border dark:border-neutral-200">{{ $t('fwDestination') }}</th>
              <th class="border dark:border-neutral-200">{{ $t('fwProtocol') }}</th>
              <th class="border dark:border-neutral-200">{{ $t('fwTarget') }}</th>
            </tr>
          </thead>
          <tbody class="text-center">
            <tr v-for="(rule, index) in rules" :key="index">
              <td class="border border-neutral-500/50 p-1 hover:bg-red-800/50 transition">
                <button type="button" @click="deleteRule(rule.num)">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                    stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </td>
              <td class="border border-neutral-500/50 p-1">{{ rule.source }}</td>
              <td class="border border-neutral-500/50 p-1">{{ rule.destination }}</td>
              <td class="border border-neutral-500/50 p-1">{{ rule.protocol }}</td>
              <td class="border border-neutral-500/50 p-1">{{ rule.target }}</td>
            </tr>
            <tr>
              <td class="border border-neutral-500/50 p-1 hover:bg-green-800/50 transition">
                <button form="fw" type="submit">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                    stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </td>
              <td class="border border-neutral-500/50">
                <input form="fw" type="text" name="source" v-model="newRule.source"
                  class=" outline-none bg-transparent text-center" />
              </td>
              <td class="border border-neutral-500/50">
                <input form="fw" type="text" name="destination" v-model="newRule.destination"
                  class=" outline-none bg-transparent text-center" />
              </td>
              <td class="border border-neutral-500/50">
                <select form="fw" name="protocol" v-model="newRule.protocol" class="bg-transparent">
                  <option class="dark:text-white dark:bg-neutral-700" value="tcp">TCP</option>
                  <option class="dark:text-white dark:bg-neutral-700" value="udp">UDP</option>
                </select>
              </td>
              <td class="border border-neutral-500/50 p-1">
                <select form="fw" name="target" v-model="newRule.target" class="bg-transparent">
                  <option class="dark:text-white dark:bg-neutral-700" value="ACCEPT">ALLOW</option>
                  <option class="dark:text-white dark:bg-neutral-700" value="DROP">BLOCK</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
