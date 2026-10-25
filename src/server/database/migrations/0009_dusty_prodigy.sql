UPDATE `hooks_table` SET
  `pre_up` = replace(`pre_up`, 'wg0', '{{interface}}'),
  `post_up` = replace(`post_up`, 'wg0', '{{interface}}'),
  `pre_down` = replace(`pre_down`, 'wg0', '{{interface}}'),
  `post_down` = replace(`post_down`, 'wg0', '{{interface}}');
