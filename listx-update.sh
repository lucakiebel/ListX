#!/bin/bash
mypath=`realpath $0`
cd `dirname $mypath`

git pull;
pm2 restart ListX;