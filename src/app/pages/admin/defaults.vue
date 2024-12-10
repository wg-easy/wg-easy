<template>
  <div>
    <FormGroup>
      <FormHeading>Connection</FormHeading>
      <FormTextField id="host" label="Host" />
      <FormTextField id="port" label="Port" />
    </FormGroup>
    <FormGroup>
      <FormHeading>Allowed IPs</FormHeading>
      <FormArrayField />
    </FormGroup>
    <FormGroup>
      <FormHeading>DNS</FormHeading>
      <FormArrayField />
    </FormGroup>
    <FormGroup>
      <FormHeading>Advanced</FormHeading>
      <FormNumberField id="mtu" label="MTU" />
      <FormNumberField id="keepalive" label="Persistent Keepalive" />
    </FormGroup>
  </div>
</template>

<script setup lang="ts"></script>
