# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Yedekleme Servisi
Otomatik veritabanı yedekleme işlemleri.
"""

import os
import shutil
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler


def backup_database(app):
    """
    Veritabanını yedekler
    
    Args:
        app: Flask uygulaması
    """
    with app.app_context():
        try:
            db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
            
            if not os.path.exists(db_path):
                print('Veritabanı dosyası bulunamadı, yedekleme atlandı.')
                return
            
            backup_folder = app.config['BACKUP_FOLDER']
            os.makedirs(backup_folder, exist_ok=True)
            
            # Yedek dosya adı
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f'backup_{timestamp}.db'
            backup_path = os.path.join(backup_folder, backup_filename)
            
            # Veritabanını kopyala
            shutil.copy2(db_path, backup_path)
            print(f'Veritabanı yedeklendi: {backup_path}')
            
            # Eski yedekleri temizle (son 30 yedeği tut)
            cleanup_old_backups(backup_folder, keep_count=30)
            
        except Exception as e:
            print(f'Yedekleme hatası: {str(e)}')


def cleanup_old_backups(backup_folder, keep_count=30):
    """
    Eski yedekleri temizler
    
    Args:
        backup_folder: Yedek klasörü
        keep_count: Tutulacak yedek sayısı
    """
    try:
        backups = []
        for filename in os.listdir(backup_folder):
            if filename.startswith('backup_') and filename.endswith('.db'):
                filepath = os.path.join(backup_folder, filename)
                backups.append((filepath, os.path.getmtime(filepath)))
        
        # Tarihe göre sırala (en yeni en üstte)
        backups.sort(key=lambda x: x[1], reverse=True)
        
        # Fazla yedekleri sil
        for filepath, _ in backups[keep_count:]:
            os.remove(filepath)
            print(f'Eski yedek silindi: {filepath}')
            
    except Exception as e:
        print(f'Yedek temizleme hatası: {str(e)}')


def init_backup_scheduler(app):
    """
    Yedekleme zamanlayıcısını başlatır
    
    Args:
        app: Flask uygulaması
    """
    if app.config.get('TESTING'):
        return
    
    scheduler = BackgroundScheduler()
    
    # Yedekleme aralığını ayarla
    interval_hours = app.config.get('BACKUP_INTERVAL_HOURS', 24)
    
    scheduler.add_job(
        func=lambda: backup_database(app),
        trigger='interval',
        hours=interval_hours,
        id='database_backup',
        name='Veritabanı Yedekleme',
        replace_existing=True
    )
    
    # İlk yedeklemeyi hemen al
    scheduler.add_job(
        func=lambda: backup_database(app),
        trigger='date',
        run_date=datetime.now(),
        id='initial_backup',
        name='İlk Yedekleme'
    )
    
    scheduler.start()
    print(f'Yedekleme zamanlayıcısı başlatıldı (her {interval_hours} saatte bir)')
