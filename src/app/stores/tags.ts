import { defineStore } from 'pinia';
import type { TypedInternalResponse } from 'nitropack/types';

export type LocalTag = TypedInternalResponse<
  '/api/tag',
  unknown,
  'get'
>[number];

export const useTagsStore = defineStore('Tags', () => {
  const { data: tags, refresh } = useFetch('/api/tag', {
    method: 'get',
  });

  return { tags, refresh };
});
