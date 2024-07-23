<script>
export default {
  name: 'Firewall',
  data() {
    let interfaces = [];
    return { interfaces };
  },
  methods: {
    getInterfaces() {
      this.api.getInterfaces().then((interfaces) => {
        this.interfaces = interfaces;
      })
        .catch((err) => {
          alert(err.message || err.toString());
        })
    }
  },
  mounted() {
    this.api = new API();
    this.getInterfaces();
  }
}
</script>

<template>
  <div class="shadow-md rounded-lg bg-white dark:bg-neutral-700 overflow-hidden">
    <div class="flex flex-row flex-auto items-center mb-4 p-3 px-5 border-b-2 border-gray-100 dark:border-neutral-600">
      <div class="flex-grow">
        <p class="text-2xl font-medium dark:text-neutral-200">{{ $t("firewall") }}</p>
      </div>
    </div>

    <table class="table-auto w-[70%] dark:text-neutral-200 mb-4">
      <thead>
        <tr>
          <th>Interface</th>
          <th>IPv4 address</th>
          <th>IPv6 address</th>
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
          <th>Action</th>
          <th class="border-x-2 dark:border-neutral-200">Source</th>
          <th class="border-x-2 dark:border-neutral-200">Destination</th>
          <th class="border-x-2 dark:border-neutral-200">Protocol</th>
          <th></th>
        </tr>
      </thead>
      <tbody class="text-center">
        <tr>
          <td class="border border-gray-600 p-1">delete</td>
          <td class="border border-gray-600 p-1">192.168.11.3</td>
          <td class="border border-gray-600 p-1">10.9.8.1</td>
          <td class="border border-gray-600 p-1">udp</td>
          <td class="border border-gray-600 p-1"></td>
        </tr>
        <tr>
          <td class="border border-gray-600 p-1">
            <form id="fw">
              <input form="fw" type="submit" value="send" class="w-full outline-none bg-transparent text-center" />
            </form>
          </td>
          <td class="border border-gray-600">
            <input form="fw" type="text" name="source" class="w-full outline-none bg-transparent text-center" />
          </td>
          <td class="border border-gray-600">
            <input form="fw" type="text" name="destination" class="w-full outline-none bg-transparent text-center" />
          </td>
          <td class="border border-gray-600">
            <select form="fw" name="protocol" class="bg-transparent">
              <option value="tcp">tcp</option>
              <option value="udp">udp</option>
            </select>
          </td>
          <td class="border border-gray-600 p-1">
            <select form="fw" name="action" class="bg-transparent">
              <option value="allow">allow</option>
              <option value="block">block</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
