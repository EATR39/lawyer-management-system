# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Belge Modeli
Belge veritabanı modelini tanımlar.
"""

from datetime import datetime
from app import db


class Document(db.Model):
    """
    Belge modeli
    
    Attributes:
        id: Benzersiz belge kimliği
        filename: Sistem dosya adı
        original_filename: Orijinal dosya adı
        file_path: Dosya yolu
        file_size: Dosya boyutu (bytes)
        mime_type: MIME tipi
        document_type: Belge tipi
        related_to: İlişkili varlık tipi (client, case)
        related_id: İlişkili varlık ID'si
        description: Açıklama
        uploaded_by: Yükleyen kullanıcı ID'si
        created_at: Oluşturulma tarihi
        updated_at: Güncellenme tarihi
    """
    
    __tablename__ = 'documents'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    document_type = db.Column(db.String(50))
    related_to = db.Column(db.String(20))  # client, case
    related_id = db.Column(db.Integer)
    description = db.Column(db.Text)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler
    uploader = db.relationship('User', foreign_keys=[uploaded_by])
    
    # Belge tipleri
    DOCUMENT_TYPES = {
        'petition': 'Dilekçe',
        'contract': 'Sözleşme',
        'court_decision': 'Mahkeme Kararı',
        'evidence': 'Delil',
        'correspondence': 'Yazışma',
        'power_of_attorney': 'Vekaletname',
        'identity': 'Kimlik Belgesi',
        'invoice': 'Fatura',
        'other': 'Diğer'
    }
    
    @property
    def document_type_display(self):
        """Belge tipi görüntü adını döndürür"""
        return self.DOCUMENT_TYPES.get(self.document_type, self.document_type)
    
    @property
    def file_size_display(self):
        """Dosya boyutunu okunabilir formatta döndürür"""
        if not self.file_size:
            return 'Bilinmiyor'
        
        for unit in ['B', 'KB', 'MB', 'GB']:
            if self.file_size < 1024:
                return f'{self.file_size:.1f} {unit}'
            self.file_size /= 1024
        return f'{self.file_size:.1f} TB'
    
    @property
    def extension(self):
        """Dosya uzantısını döndürür"""
        if '.' in self.original_filename:
            return self.original_filename.rsplit('.', 1)[1].lower()
        return ''
    
    def to_dict(self, include_relations=False):
        """Model'i sözlük olarak döndürür"""
        data = {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'file_size_display': self.file_size_display,
            'mime_type': self.mime_type,
            'document_type': self.document_type,
            'document_type_display': self.document_type_display,
            'extension': self.extension,
            'related_to': self.related_to,
            'related_id': self.related_id,
            'description': self.description,
            'uploaded_by': self.uploaded_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_relations:
            data['uploader'] = self.uploader.to_dict() if self.uploader else None
        
        return data
    
    def __repr__(self):
        return f'<Document {self.original_filename}>'
