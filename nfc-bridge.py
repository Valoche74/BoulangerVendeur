#!/usr/bin/env python3
# Pont NFC -> kiosque (Raspberry Pi) : lit l'UID de la carte posee sur le
# lecteur ACR1552U et le "tape" au clavier (+ Entree) dans la fenetre active
# (Chromium kiosque, champ card_id/UID focalise).
# Prerequis : pcscd, python3-pyscard, xdotool, session en X11.
import time, subprocess
from smartcard.System import readers

GET_UID = [0xFF, 0xCA, 0x00, 0x00, 0x00]

def first_reader():
    rs = readers()
    return rs[0] if rs else None

print("Pont NFC demarre. Pose une carte... (Ctrl+C pour arreter)")
while True:
    r = first_reader()
    if not r:
        time.sleep(1); continue
    try:
        conn = r.createConnection(); conn.connect()
        data, sw1, sw2 = conn.transmit(GET_UID)
        if (sw1, sw2) == (0x90, 0x00):
            uid = ''.join('%02X' % b for b in data)
            subprocess.run(['xdotool', 'type', '--clearmodifiers', uid])
            subprocess.run(['xdotool', 'key', 'Return'])
            print("Carte:", uid)
        # attendre le retrait de la carte (evite les scans repetes)
        while True:
            try:
                c2 = r.createConnection(); c2.connect(); c2.disconnect(); time.sleep(0.4)
            except Exception:
                break
    except Exception:
        time.sleep(0.4)
