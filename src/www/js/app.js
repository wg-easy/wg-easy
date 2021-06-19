/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-undef */
/* eslint-disable no-new */

'use strict';

new Vue({
  el: '#app',
  data: {
    authenticated: null,
    authenticating: false,
    password: null,
    requiresPassword: null,

    clients: null,
    clientDelete: null,
    clientCreate: null,
    clientCreateName: '',
    clientCreateNumber: '',
    qrcode: null,
  },
  methods: {
    dateTime: value => {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(value);
    },
    async refresh() {
      if (!this.authenticated) return;

      const clients = await this.api.getClients();

      // Sort clients by last IP number
      clients.sort((clientA, clientB) => {
        return +clientA.address.split('.').pop() - +clientB.address.split('.').pop();
      });

      this.clients = clients.map(client => {
        if (client.name.includes('@') && client.name.includes('.')) {
          client.avatar = `https://www.gravatar.com/avatar/${md5(client.name)}?d=blank`;
        }

        return client;
      });

      console.log(clients);
    },
    login(e) {
      e.preventDefault();

      if (!this.password) return;
      if (this.authenticating) return;

      this.authenticating = true;
      this.api.createSession({
        password: this.password,
      })
        .then(async () => {
          const session = await this.api.getSession();
          this.authenticated = session.authenticated;
          this.requiresPassword = session.requiresPassword;
          return this.refresh();
        })
        .catch(err => {
          alert(err.message || err.toString());
        })
        .finally(() => {
          this.authenticating = false;
        });
    },
    logout(e) {
      e.preventDefault();

      this.api.deleteSession()
        .then(() => {
          this.authenticated = false;
          this.clients = null;
        })
        .catch(err => {
          alert(err.message || err.toString());
        });
    },
    createClient() {
      const name = this.clientCreateName;
      const number = this.clientCreateNumber;
      if (!name) return;

      this.api.createClient({ name, number })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    deleteClient(client) {
      this.api.deleteClient({ clientId: client.id })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    enableClient(client) {
      this.api.enableClient({ clientId: client.id })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    disableClient(client) {
      this.api.disableClient({ clientId: client.id })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
  },
  filters: {
    timeago: value => {
      return timeago().format(value);
    },
    bytes: (bytes, decimals, kib, maxunit) => {
      kib = kib || false;
      if (bytes === 0) return '0 Bytes';
      if (Number.isNaN(parseFloat(bytes)) && !Number.isFinite(bytes)) return 'Not an number';
      const k = kib ? 1024 : 1000;
      const dm = decimals != null && !Number.isNaN(decimals) && decimals >= 0 ? decimals : 2;
      const sizes = kib
        ? ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB', 'BiB']
        : ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
      let i = Math.floor(Math.log(bytes) / Math.log(k));
      if (maxunit !== undefined) {
        const index = sizes.indexOf(maxunit);
        if (index !== -1) i = index;
      }
      // eslint-disable-next-line no-restricted-properties
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },
  },
  mounted() {
    this.api = new API();
    this.api.getSession()
      .then(session => {
        this.authenticated = session.authenticated;
        this.requiresPassword = session.requiresPassword;
        this.refresh().catch(err => {
          alert(err.message || err.toString());
        });
      })
      .catch(err => {
        alert(err.message || err.toString());
      });

    setInterval(() => {
      this.refresh().catch(console.error);
    }, 1000);
  },
});
