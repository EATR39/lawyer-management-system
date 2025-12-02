#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Ana Başlatıcı
Bu dosya Flask uygulamasını başlatır.
"""

import os
from app import create_app

# Flask uygulamasını oluştur
app = create_app()

if __name__ == '__main__':
    # Geliştirme sunucusunu başlat
    # Debug modu ortam değişkeninden alınır (varsayılan: kapalı)
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 'yes')
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=debug_mode
    )
