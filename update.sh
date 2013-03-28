#!/bin/bash

CODE_DIR=$(cd `dirname $0`; pwd)
WEB_DIR="$CODE_DIR/web-output"
ENV=$(echo "$CODE_DIR" | cut -f3 -d'/')
SITE=$(echo "$CODE_DIR" | cut -f5 -d'/')
APP=fhr-jelly
LOCALE_REPO="https://svn.mozilla.org/projects/l10n-misc/trunk/firefoxhealthreport/locale"


### No edits needed below here ###

function checkretval()
{
    retval=$?
        if [[ $retval -gt 0 ]]
        then
                $error "Error!!! Exit status of the last command was $retval"
                exit $retval
        fi
}

echo "DIR: $CODE_DIR"
echo "ENV: $ENV"
echo "SITE: $SITE"
echo "APP: $APP"

echo -e "Updating code..."
pushd $CODE_DIR/$APP

git pull

if [ ! -d "locale" ]; then
    svn checkout ${LOCALE_REPO}
fi
pushd locale
svn up
popd

./generate.py --output-dir $WEB_DIR -f --nowarn
checkretval

popd

/data/$ENV/deploy -n $SITE

