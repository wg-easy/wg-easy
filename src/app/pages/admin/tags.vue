<template>
  <main>
    <div class="flex items-center justify-between px-3 py-3">
      <AdminTagsCreateDialog>
        <BaseSecondaryButton as="span">
          <IconsPlus class="mr-2 w-4" />
          <span class="text-sm">{{ $t('admin.tags.new') }}</span>
        </BaseSecondaryButton>
      </AdminTagsCreateDialog>
    </div>
    <AdminTagsList />
  </main>
</template>
