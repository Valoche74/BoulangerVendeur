#!/bin/bash
# Demarrage automatique du kiosque Falman (Raspberry Pi)
# - clavier US (pour que le scan tape l'UID proprement)
# - pont NFC (lecteur -> kiosque)
# - Chromium plein ecran sur le kiosque
sleep 8
setxkbmap us
pkill -f nfc-bridge.py 2>/dev/null
python3 /home/perier/nfc-bridge.py &
chromium --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-features=Translate "https://boulangerie-vendeur.vercel.app/kiosque.html"
