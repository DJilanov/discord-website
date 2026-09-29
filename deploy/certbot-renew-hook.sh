#!/bin/sh
set -eu
case " ${RENEWED_DOMAINS:-} " in
    *" wowforeverdiscord.online "*|*" www.wowforeverdiscord.online "*)
        /usr/sbin/nginx -t
        /bin/systemctl reload nginx
        ;;
esac
