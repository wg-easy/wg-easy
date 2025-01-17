-- Custom SQL migration file, put your code below! --
INSERT INTO `general_table` (`setupStep`, `session_password`, `session_timeout`)
VALUES (1, hex(randomblob(256)), 3600);
