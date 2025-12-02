# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Lead Routes
Potansiyel iş CRUD endpoint'leri.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Lead, Client
from app.utils.decorators import role_required

leads_bp = Blueprint('leads', __name__)


@leads_bp.route('', methods=['GET'])
@jwt_required()
def get_leads():
    """
    Lead listesi
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config['ITEMS_PER_PAGE'], type=int)
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    source = request.args.get('source', '')
    sort = request.args.get('sort', 'created_at')
    order = request.args.get('order', 'desc')
    
    query = Lead.query
    
    if search:
        search_filter = f'%{search}%'
        query = query.filter(
            db.or_(
                Lead.name.ilike(search_filter),
                Lead.contact_info.ilike(search_filter),
                Lead.description.ilike(search_filter)
            )
        )
    
    if status:
        query = query.filter(Lead.status == status)
    if source:
        query = query.filter(Lead.source == source)
    
    sort_column = getattr(Lead, sort, Lead.created_at)
    if order == 'desc':
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'leads': [l.to_dict(include_relations=True) for l in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@leads_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_lead(id):
    """
    Tek lead detayı
    """
    lead = Lead.query.get_or_404(id)
    return jsonify({
        'lead': lead.to_dict(include_relations=True)
    }), 200


@leads_bp.route('', methods=['POST'])
@jwt_required()
def create_lead():
    """
    Yeni lead oluştur
    """
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    if not data.get('name'):
        return jsonify({'message': 'İsim gereklidir'}), 400
    
    lead = Lead(
        name=data['name'].strip(),
        contact_info=data.get('contact_info', '').strip() or None,
        case_type=data.get('case_type'),
        description=data.get('description', '').strip() or None,
        source=data.get('source'),
        status=data.get('status', 'new'),
        notes=data.get('notes', '').strip() or None,
        created_by=current_user_id
    )
    
    if data.get('estimated_value'):
        try:
            lead.estimated_value = float(data['estimated_value'])
        except ValueError:
            pass
    
    if data.get('follow_up_date'):
        try:
            lead.follow_up_date = datetime.fromisoformat(data['follow_up_date'].replace('Z', '+00:00')).date()
        except ValueError:
            pass
    
    db.session.add(lead)
    db.session.commit()
    
    return jsonify({
        'message': 'Lead başarıyla oluşturuldu',
        'lead': lead.to_dict()
    }), 201


@leads_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_lead(id):
    """
    Lead güncelle
    """
    lead = Lead.query.get_or_404(id)
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    if 'name' in data:
        lead.name = data['name'].strip()
    if 'contact_info' in data:
        lead.contact_info = data['contact_info'].strip() or None
    if 'case_type' in data:
        lead.case_type = data['case_type']
    if 'description' in data:
        lead.description = data['description'].strip() or None
    if 'source' in data:
        lead.source = data['source']
    if 'status' in data:
        lead.status = data['status']
    if 'notes' in data:
        lead.notes = data['notes'].strip() or None
    
    if 'estimated_value' in data:
        if data['estimated_value']:
            try:
                lead.estimated_value = float(data['estimated_value'])
            except ValueError:
                pass
        else:
            lead.estimated_value = None
    
    if 'follow_up_date' in data:
        if data['follow_up_date']:
            try:
                lead.follow_up_date = datetime.fromisoformat(data['follow_up_date'].replace('Z', '+00:00')).date()
            except ValueError:
                pass
        else:
            lead.follow_up_date = None
    
    db.session.commit()
    
    return jsonify({
        'message': 'Lead başarıyla güncellendi',
        'lead': lead.to_dict()
    }), 200


@leads_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'lawyer'])
def delete_lead(id):
    """
    Lead sil
    """
    lead = Lead.query.get_or_404(id)
    db.session.delete(lead)
    db.session.commit()
    
    return jsonify({'message': 'Lead başarıyla silindi'}), 200


@leads_bp.route('/<int:id>/convert', methods=['POST'])
@jwt_required()
def convert_to_client(id):
    """
    Lead'i müvekkile dönüştür
    """
    current_user_id = get_jwt_identity()
    lead = Lead.query.get_or_404(id)
    
    if lead.status == 'converted':
        return jsonify({'message': 'Bu lead zaten müvekkile dönüştürülmüş'}), 400
    
    data = request.get_json() or {}
    
    # İsmi parçala
    name_parts = lead.name.strip().split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''
    
    # Müvekkil oluştur
    client = Client(
        name=data.get('name', first_name),
        surname=data.get('surname', last_name),
        phone=data.get('phone', lead.contact_info),
        email=data.get('email'),
        notes=f"Lead'den dönüştürüldü. Orijinal açıklama: {lead.description or ''}",
        status='active',
        created_by=current_user_id
    )
    
    db.session.add(client)
    db.session.flush()  # ID almak için
    
    # Lead'i güncelle
    lead.status = 'converted'
    lead.converted_to_client_id = client.id
    
    db.session.commit()
    
    return jsonify({
        'message': 'Lead başarıyla müvekkile dönüştürüldü',
        'client': client.to_dict(),
        'lead': lead.to_dict()
    }), 201


@leads_bp.route('/statuses', methods=['GET'])
@jwt_required()
def get_statuses():
    """
    Lead durumlarını listele
    """
    return jsonify({
        'statuses': Lead.STATUSES
    }), 200


@leads_bp.route('/sources', methods=['GET'])
@jwt_required()
def get_sources():
    """
    Lead kaynaklarını listele
    """
    return jsonify({
        'sources': Lead.SOURCES
    }), 200
