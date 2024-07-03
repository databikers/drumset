#!/bin/bash
if [ $1 ]
  then
    old_package_origin=$(git remote get-url origin)
    old_package_name=$(echo old_package_origin | rev  | cut -d '/' -f1 | rev | cut -d '.' -f1);
    git remote rename origin base;
    new_package_name=$(echo $1 | rev  | cut -d '/' -f1 | rev | cut -d '.' -f1);
    sed -i "s/old_package_name/new_package_name/" package.json;
    git remote add origin $1;
    sed -i "s/$(echo $old_package_origin | sed 's/\//\\\//g')/$(echo $1 | sed 's/\//\\\//g')/" package.json;
fi
