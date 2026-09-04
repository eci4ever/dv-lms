-- Custom SQL migration file, put your code below! --
UPDATE `course`
SET `priceSen` = 0
WHERE `slug` = 'network-administration-essentials';
