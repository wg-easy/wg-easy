<template>
  <div>
    <FormGroup>
      <FormHeading>Interface Settings</FormHeading>
      <FormNumberField id="mtu" label="MTU" />
      <FormNumberField id="port" label="Port" />
      <FormTextField id="device" label="Device" />
    </FormGroup>
    <FormGroup>
      <FormHeading>Scripts</FormHeading>
      <FormTextField id="mtu" label="PreUp" />
      <FormTextField id="port" label="PostUp" />
      <FormTextField id="device" label="PreDown" />
      <FormTextField id="device" label="PostDown" />
    </FormGroup>
  </div>
</template>

<script setup lang="ts"></script>
