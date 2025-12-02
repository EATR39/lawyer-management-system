# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Şablon Modeli
Belge şablonu veritabanı modelini tanımlar.
"""

from datetime import datetime
from app import db


class Template(db.Model):
    """
    Şablon modeli
    
    Attributes:
        id: Benzersiz şablon kimliği
        name: Şablon adı
        template_type: Şablon tipi
        content: Şablon içeriği
        variables: Değişkenler (JSON)
        category: Kategori
        is_public: Herkese açık mı
        created_by: Oluşturan kullanıcı ID'si
        created_at: Oluşturulma tarihi
        updated_at: Güncellenme tarihi
    """
    
    __tablename__ = 'templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    template_type = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text, nullable=False)
    variables = db.Column(db.Text)  # JSON olarak saklanacak
    category = db.Column(db.String(50))
    is_public = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler
    creator = db.relationship('User', foreign_keys=[created_by])
    
    # Şablon tipleri
    TEMPLATE_TYPES = {
        'petition': 'Dilekçe',
        'contract': 'Sözleşme',
        'power_of_attorney': 'Vekaletname',
        'letter': 'Mektup',
        'invoice': 'Fatura',
        'other': 'Diğer'
    }
    
    # Kategoriler
    CATEGORIES = {
        'criminal': 'Ceza Hukuku',
        'civil': 'Medeni Hukuk',
        'family': 'Aile Hukuku',
        'labor': 'İş Hukuku',
        'commercial': 'Ticaret Hukuku',
        'administrative': 'İdare Hukuku',
        'general': 'Genel'
    }
    
    @property
    def template_type_display(self):
        """Şablon tipi görüntü adını döndürür"""
        return self.TEMPLATE_TYPES.get(self.template_type, self.template_type)
    
    @property
    def category_display(self):
        """Kategori görüntü adını döndürür"""
        return self.CATEGORIES.get(self.category, self.category)
    
    def get_variables_list(self):
        """Değişkenleri liste olarak döndürür"""
        import json
        if self.variables:
            try:
                return json.loads(self.variables)
            except json.JSONDecodeError:
                return []
        return []
    
    def set_variables_list(self, variables_list):
        """Değişkenleri JSON olarak saklar"""
        import json
        self.variables = json.dumps(variables_list)
    
    def render(self, context=None):
        """
        Şablonu verilen context ile render eder
        
        Args:
            context: Değişken değerleri sözlüğü
        
        Returns:
            str: Render edilmiş içerik
        """
        content = self.content
        if context:
            for key, value in context.items():
                placeholder = '{{' + key + '}}'
                content = content.replace(placeholder, str(value) if value else '')
        return content
    
    def to_dict(self, include_relations=False):
        """Model'i sözlük olarak döndürür"""
        data = {
            'id': self.id,
            'name': self.name,
            'template_type': self.template_type,
            'template_type_display': self.template_type_display,
            'content': self.content,
            'variables': self.get_variables_list(),
            'category': self.category,
            'category_display': self.category_display,
            'is_public': self.is_public,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_relations:
            data['creator'] = self.creator.to_dict() if self.creator else None
        
        return data
    
    def __repr__(self):
        return f'<Template {self.name}>'
