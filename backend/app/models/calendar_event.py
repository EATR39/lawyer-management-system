# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Takvim Etkinliği Modeli
Takvim etkinliği veritabanı modelini tanımlar.
"""

from datetime import datetime
from app import db


class CalendarEvent(db.Model):
    """
    Takvim etkinliği modeli
    
    Attributes:
        id: Benzersiz etkinlik kimliği
        title: Etkinlik başlığı
        event_type: Etkinlik tipi
        start_datetime: Başlangıç tarihi/saati
        end_datetime: Bitiş tarihi/saati
        location: Konum
        related_to: İlişkili varlık tipi (case, client)
        related_id: İlişkili varlık ID'si
        reminder_time: Hatırlatma süresi (dakika)
        status: Etkinlik durumu
        description: Açıklama
        created_by: Oluşturan kullanıcı ID'si
        created_at: Oluşturulma tarihi
        updated_at: Güncellenme tarihi
    """
    
    __tablename__ = 'calendar_events'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    event_type = db.Column(db.String(50), nullable=False)
    start_datetime = db.Column(db.DateTime, nullable=False)
    end_datetime = db.Column(db.DateTime)
    location = db.Column(db.String(200))
    related_to = db.Column(db.String(20))  # case, client
    related_id = db.Column(db.Integer)
    reminder_time = db.Column(db.Integer, default=60)  # dakika
    status = db.Column(db.String(20), default='scheduled')
    description = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler
    creator = db.relationship('User', foreign_keys=[created_by])
    
    # Etkinlik tipleri
    EVENT_TYPES = {
        'hearing': 'Duruşma',
        'meeting': 'Toplantı',
        'deadline': 'Son Tarih',
        'appointment': 'Randevu',
        'reminder': 'Hatırlatma',
        'other': 'Diğer'
    }
    
    # Durumlar
    STATUSES = {
        'scheduled': 'Planlandı',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal Edildi',
        'postponed': 'Ertelendi'
    }
    
    @property
    def event_type_display(self):
        """Etkinlik tipi görüntü adını döndürür"""
        return self.EVENT_TYPES.get(self.event_type, self.event_type)
    
    @property
    def status_display(self):
        """Durum görüntü adını döndürür"""
        return self.STATUSES.get(self.status, self.status)
    
    @property
    def is_past(self):
        """Etkinliğin geçmiş olup olmadığını kontrol eder"""
        return self.start_datetime < datetime.utcnow()
    
    @property
    def is_upcoming(self):
        """Etkinliğin yaklaşan olup olmadığını kontrol eder"""
        return self.start_datetime > datetime.utcnow() and self.status == 'scheduled'
    
    @property
    def duration_minutes(self):
        """Etkinlik süresini dakika olarak döndürür"""
        if self.end_datetime:
            delta = self.end_datetime - self.start_datetime
            return int(delta.total_seconds() / 60)
        return None
    
    def to_dict(self, include_relations=False):
        """Model'i sözlük olarak döndürür"""
        data = {
            'id': self.id,
            'title': self.title,
            'event_type': self.event_type,
            'event_type_display': self.event_type_display,
            'start_datetime': self.start_datetime.isoformat() if self.start_datetime else None,
            'end_datetime': self.end_datetime.isoformat() if self.end_datetime else None,
            'location': self.location,
            'related_to': self.related_to,
            'related_id': self.related_id,
            'reminder_time': self.reminder_time,
            'status': self.status,
            'status_display': self.status_display,
            'is_past': self.is_past,
            'is_upcoming': self.is_upcoming,
            'duration_minutes': self.duration_minutes,
            'description': self.description,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_relations:
            data['creator'] = self.creator.to_dict() if self.creator else None
            
            # İlişkili varlığı ekle
            if self.related_to == 'case' and self.related_id:
                from app.models.case import Case
                case = Case.query.get(self.related_id)
                data['related_case'] = case.to_dict() if case else None
            elif self.related_to == 'client' and self.related_id:
                from app.models.client import Client
                client = Client.query.get(self.related_id)
                data['related_client'] = client.to_dict() if client else None
        
        return data
    
    def __repr__(self):
        return f'<CalendarEvent {self.title}>'
