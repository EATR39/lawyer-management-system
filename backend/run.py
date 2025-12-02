#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Ana Başlatıcı
Bu dosya Flask uygulamasını başlatır.
"""

from app import create_app

# Flask uygulamasını oluştur
app = create_app()

if __name__ == '__main__':
    # Geliştirme sunucusunu başlat
    # Debug modu aktif, localhost üzerinde çalışır
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=True
    )
